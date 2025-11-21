#!/usr/bin/env node

/**
 * E2E Test Agent CLI
 *
 * Generates Playwright tests (.spec.ts files) from high-level YAML specifications using LLM.
 * The YAML format supports job/prompt/acceptance structure.
 * Jobs within a test are executed sequentially in the same browser session.
 *
 * Output formats:
 * - .spec.ts: Standard Playwright test files (always generated)
 * - .ox.test: OXTest DSL format (generated with --oxtest flag)
 *
 * OXTest is a simple domain-specific language for E2E tests with commands like:
 *   navigate, click, type, assert_visible, assert_text, etc.
 *   Commands defined in: src/domain/enums/CommandType.ts
 *
 * Usage:
 *   e2e-test-agent --src=tests.yaml --output=_generated
 *   e2e-test-agent --src=tests.yaml --output=_generated --oxtest
 */

import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'yaml';
import { minimatch } from 'minimatch';
import { chromium } from 'playwright';
import { OpenAI } from 'openai';
import { OpenAILLMProvider } from './infrastructure/llm/OpenAILLMProvider';
import { ILLMProvider } from './infrastructure/llm/interfaces';
import { OxtestParser } from './infrastructure/parsers/OxtestParser';
import { PlaywrightExecutor } from './infrastructure/executors/PlaywrightExecutor';
import { TestOrchestrator } from './application/orchestrators/TestOrchestrator';
import { ReportAdapter } from './application/orchestrators/ReportAdapter';
import { IterativeDecompositionEngine } from './application/engines/IterativeDecompositionEngine';
import { SimpleEOPEngine } from './application/engines/SimpleEOPEngine';
import { HTMLExtractor } from './application/engines/HTMLExtractor';
import { LanguageDetectionService } from './application/services/LanguageDetectionService';
import { OxtestPromptBuilder } from './infrastructure/llm/OxtestPromptBuilder';
import { Subtask } from './domain/entities/Subtask';
import { OxtestCommand } from './domain/entities/OxtestCommand';
import { createReporter } from './presentation/reporters';
import { version } from './index';

/**
 * High-level YAML format (what users write)
 */
interface JobSpec {
  name: string;
  prompt: string;
  acceptance?: string[];
}

interface HighLevelYaml {
  [testName: string]: {
    environment?: string;
    url: string;
    timeout?: number;
    jobs: JobSpec[];
  };
}

/**
 * CLI Application
 */
class CLI {
  private program: Command;

  constructor() {
    this.program = new Command();
    this.setupCommands();
  }

  private setupCommands(): void {
    this.program
      .name('e2e-test-agent')
      .description('Generate Playwright E2E tests from natural language specifications')
      .version(version)
      .option('-s, --src <path>', 'Path to YAML test specification file')
      .option('-o, --output <path>', 'Output directory for generated tests', '_generated')
      .option('--format <format>', 'Output format (oxtest|playwright)', 'oxtest')
      .option('--oxtest', 'Also generate .ox.test files alongside Playwright tests', false)
      .option('--execute', 'Execute generated OXTest files after generation', false)
      .option(
        '--tests <pattern>',
        'Glob pattern for which .ox.test files to execute (e.g., "*.ox.test" or "paypal*.ox.test")'
      )
      .option(
        '--reporter <types>',
        'Report formats (comma-separated: json,html,junit,console)',
        'console'
      )
      .option('--env <path>', 'Path to .env file (optional)')
      .option('--verbose', 'Enable verbose logging', false)
      .action(async options => {
        await this.run(options);
      });
  }

  private async run(options: {
    src?: string;
    output: string;
    format: string;
    oxtest?: boolean;
    execute?: boolean;
    tests?: string;
    reporter?: string;
    env?: string;
    verbose?: boolean;
  }): Promise<void> {
    try {
      // Load environment variables first
      this.loadEnvironment(options.env);

      // If --execute is set without --src, run existing tests
      if (options.execute && !options.src) {
        console.log('🚀 Executing existing OXTest files...');

        // Initialize LLM provider for selector refinement during execution
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) {
          console.error('❌ Error: OPENAI_API_KEY environment variable not set');
          console.error('Please set OPENAI_API_KEY or provide an .env file with --env');
          process.exit(1);
        }

        const model = process.env.OPENAI_MODEL;
        if (!model) {
          console.error('❌ Error: OPENAI_MODEL environment variable not set');
          console.error('Please set OPENAI_MODEL in your .env file');
          process.exit(1);
        }

        const apiUrl = process.env.OPENAI_API_URL || 'https://api.openai.com/v1';

        const openaiClient = new OpenAI({
          apiKey: apiKey,
          baseURL: apiUrl,
          timeout: 60000,
        });
        const llmProvider = new OpenAILLMProvider(
          {
            apiKey: apiKey,
            apiUrl: apiUrl,
            model: model,
            maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS || '4000'),
            temperature: parseFloat(process.env.OPENAI_TEMPERATURE || '0.7'),
          },
          openaiClient
        );

        await this.executeTests(
          options.output,
          options.reporter || 'console',
          options.verbose,
          options.tests,
          llmProvider
        );
        return;
      }

      // Validate required options for generation
      if (!options.src) {
        console.error('❌ Error: --src option is required for test generation');
        console.error('');
        console.error('Usage:');
        console.error('  Generate tests:');
        console.error('    e2e-test-agent --src=<yaml-file> --output=<directory> --oxtest');
        console.error('');
        console.error('  Execute all .ox.test files:');
        console.error('    e2e-test-agent --execute --output=<directory>');
        console.error('');
        console.error('  Execute specific .ox.test files:');
        console.error(
          '    e2e-test-agent --execute --output=<directory> --tests="paypal*.ox.test"'
        );
        console.error('');
        process.exit(1);
      }

      // Verify API key
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        console.error('❌ Error: OPENAI_API_KEY environment variable not set');
        console.error('Please set OPENAI_API_KEY or provide an .env file with --env');
        process.exit(1);
      }

      // Validate model is configured (fail fast)
      const model = process.env.OPENAI_MODEL;
      if (!model) {
        console.error('❌ Error: OPENAI_MODEL environment variable not set');
        console.error('Please set OPENAI_MODEL in your .env file');
        console.error('Example: OPENAI_MODEL=gpt-4o or OPENAI_MODEL=deepseek-reasoner');
        process.exit(1);
      }

      const apiUrl = process.env.OPENAI_API_URL || 'https://api.openai.com/v1';

      if (options.verbose) {
        console.log('🔧 Configuration:');
        console.log(`   Source: ${options.src}`);
        console.log(`   Output: ${options.output}`);
        console.log(`   Format: ${options.format}`);
        console.log(`   API URL: ${apiUrl}`);
        console.log(`   Model: ${model}`);
        console.log('');
      }

      // Read and parse YAML
      console.log(`📝 Reading YAML specification: ${options.src}`);
      const yamlContent = fs.readFileSync(options.src, 'utf-8');
      const spec: HighLevelYaml = yaml.parse(yamlContent);

      // Initialize LLM provider with validated configuration
      console.log('🤖 Initializing LLM provider...');
      const openaiClient = new OpenAI({
        apiKey: apiKey,
        baseURL: apiUrl,
        timeout: 60000,
      });
      const llmProvider = new OpenAILLMProvider(
        {
          apiKey: apiKey,
          apiUrl: apiUrl,
          model: model,
          maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS || '4000'),
          temperature: parseFloat(process.env.OPENAI_TEMPERATURE || '0.7'),
        },
        openaiClient
      );

      // Create output directory
      if (!fs.existsSync(options.output)) {
        fs.mkdirSync(options.output, { recursive: true });
      }

      // Process each test suite in YAML
      for (const [testName, testSpec] of Object.entries(spec)) {
        console.log(`\n🎯 Processing test: ${testName}`);
        console.log(`   URL: ${testSpec.url}`);
        console.log(`   Jobs: ${testSpec.jobs.length}`);

        // PHASE 1: Generate OXTest FIRST (HTML-aware, accurate selectors)
        console.log('   🧠 Generating OXTest format (HTML-aware)...');
        const oxtestCode = await this.generateOXTestWithLLM(
          llmProvider,
          testName,
          testSpec.jobs,
          testSpec.url,
          options.verbose
        );

        const oxtestFileName = `${testName}.ox.test`;
        const oxtestFilePath = path.join(options.output, oxtestFileName);
        fs.writeFileSync(oxtestFilePath, oxtestCode, 'utf-8');
        console.log(`   📄 Created: ${oxtestFileName}`);

        // PHASE 2: Validate OXTest by execution (with self-healing)
        let validatedOxtestContent = oxtestCode;
        if (options.execute !== false) {
          // Default behavior: validate by execution
          try {
            const validation = await this.validateAndHealOXTest(
              oxtestFilePath,
              testName,
              llmProvider,
              options.verbose || false
            );

            if (validation.updated) {
              console.log(`   ✏️  OXTest updated (${validation.healedCount} step(s) healed)`);
              fs.writeFileSync(oxtestFilePath, validation.content, 'utf-8');
              validatedOxtestContent = validation.content;
            } else {
              console.log(`   ✅ Validation complete (no changes needed)`);
            }
          } catch (error) {
            console.error(`   ❌ Validation failed: ${(error as Error).message}`);
            console.error(`   ⚠️  OXTest may have issues, but continuing...`);
          }
        }

        // PHASE 3: Generate Playwright from validated OXTest
        // Always generate Playwright unless explicitly disabled
        console.log('   🎭 Generating Playwright from validated OXTest...');

        // Import converter
        const { OXTestToPlaywrightConverter } = await import(
          './application/services/OXTestToPlaywrightConverter'
        );
        const converter = new OXTestToPlaywrightConverter();

        const result = await converter.convert(validatedOxtestContent, {
          testName,
          baseURL: testSpec.url,
        });

        const testFileName = `${testName}.spec.ts`;
        const testFilePath = path.join(options.output, testFileName);
        fs.writeFileSync(testFilePath, result.code, 'utf-8');
        console.log(`   📄 Created: ${testFileName}`);

        if (result.warnings.length > 0 && options.verbose) {
          console.log(`   ⚠️  Warnings:`);
          result.warnings.forEach(w => console.log(`      - ${w}`));
        }
      }

      console.log('\n✅ Test generation completed successfully!');
      console.log(`📂 Output directory: ${options.output}`);

      const generatedFiles = fs.readdirSync(options.output);
      console.log(`📋 Generated ${generatedFiles.length} test file(s):`);
      generatedFiles.forEach(file => {
        console.log(`   - ${file}`);
      });
    } catch (error) {
      console.error('\n❌ Error:', (error as Error).message);
      if (options.verbose && error instanceof Error) {
        console.error('Stack trace:', error.stack);
      }
      process.exit(1);
    }
  }

  private loadEnvironment(envPath?: string): void {
    if (envPath && fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf-8');
      const lines = envContent.split('\n');

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) {
          continue;
        }

        const equalIndex = trimmed.indexOf('=');
        if (equalIndex === -1) {
          continue;
        }

        const key = trimmed.substring(0, equalIndex).trim();
        let value = trimmed.substring(equalIndex + 1).trim();

        // Handle variable substitution ${VAR:-default}
        value = value.replace(/\$\{([^}]+)\}/g, (_match, varExpr) => {
          const colonIndex = varExpr.indexOf(':-');
          if (colonIndex !== -1) {
            const varName = varExpr.substring(0, colonIndex);
            const defaultValue = varExpr.substring(colonIndex + 2);
            return process.env[varName] || defaultValue;
          }
          return process.env[varExpr] || '';
        });

        // Only set if not already in environment
        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
    }
  }

  // Legacy method - kept for backward compatibility
  // @ts-ignore - Unused but kept for backward compatibility
  private async _generateSequentialTestWithLLM(
    llmProvider: OpenAILLMProvider,
    testName: string,
    jobs: JobSpec[],
    baseUrl: string
  ): Promise<string> {
    // Build the test flow description
    const jobDescriptions = jobs
      .map((job, index) => {
        const acceptance = job.acceptance ? job.acceptance.join('\n     - ') : 'None';
        return `${index + 1}. ${job.name}: ${job.prompt}
   Acceptance Criteria:
     - ${acceptance}`;
      })
      .join('\n\n');

    const prompt = `Generate a SINGLE Playwright test file that performs ALL these steps sequentially in ONE test case:

Test Name: ${testName}
Base URL: ${baseUrl}

Sequential Test Flow (all steps run in same browser session):
${jobDescriptions}

Requirements:
1. Use Playwright with TypeScript syntax
2. Import: import { test, expect } from '@playwright/test';
3. Create ONE test case that runs ALL steps sequentially
4. Start with: await page.goto('${baseUrl}');
5. Each step should continue from where the previous step left off (same page, same session)
6. Use modern Playwright best practices (locator API, auto-waiting)
7. Add meaningful assertions after each step based on acceptance criteria
8. Add comments for each major step
9. Handle errors gracefully
10. Do NOT navigate back to homepage between steps unless explicitly required

Example structure:
test('${testName}', async ({ page }) => {
  await page.goto('${baseUrl}');

  // Step 1: ${jobs[0]?.name}
  // ... code for step 1 ...

  // Step 2: ${jobs[1]?.name}
  // ... code for step 2 ...

  // etc.
});

Generate ONLY the complete test code, no explanations. The code should be production-ready.`;

    const response = await llmProvider.generate(prompt, {
      model: process.env.OPENAI_MODEL || 'gpt-4o',
      temperature: 0.3,
      maxTokens: 4000, // Increased for longer sequential test
    });

    // Clean up the response (remove markdown code blocks if present)
    let code = response.content.trim();
    if (code.startsWith('```typescript') || code.startsWith('```ts')) {
      code = code.replace(/^```(typescript|ts)\n/, '').replace(/\n```$/, '');
    } else if (code.startsWith('```')) {
      code = code.replace(/^```\n/, '').replace(/\n```$/, '');
    }

    return code;
  }

  private async generateOXTestWithLLM(
    llmProvider: OpenAILLMProvider,
    testName: string,
    jobs: JobSpec[],
    baseUrl: string,
    verbose: boolean = false
  ): Promise<string> {
    // Launch browser to extract HTML context
    if (verbose) {
      console.log('   🌐 Launching headless browser...');
    }
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      // Navigate to the base URL to get initial HTML
      if (verbose) {
        console.log(`   🔗 Navigating to ${baseUrl}...`);
      }
      await page.goto(baseUrl);
      await page.waitForLoadState('domcontentloaded');
      if (verbose) {
        console.log('   ✓ Page loaded');
      }

      // Create HTML extractor
      const htmlExtractor = new HTMLExtractor(page);
      const parser = new OxtestParser();

      // Model already validated at initialization - no fallback needed
      const model = process.env.OPENAI_MODEL!;

      // Check if EOP mode is enabled (opt-in via environment variable)
      const useEOP = process.env.E2E_USE_EOP === 'true' || process.env.E2E_USE_EOP === '1';

      if (useEOP && verbose) {
        console.log('   🔄 Using Execute-Observe-Plan (EOP) mode for dynamic content');
      }

      // Create appropriate decomposition engine
      let engine: IterativeDecompositionEngine | SimpleEOPEngine;

      if (useEOP) {
        // EOP mode: Execute commands during generation to keep HTML fresh
        const languageDetector = new LanguageDetectionService();
        const promptBuilder = new OxtestPromptBuilder();
        engine = new SimpleEOPEngine(
          htmlExtractor,
          llmProvider,
          promptBuilder,
          parser,
          languageDetector,
          page,
          { verbose, model }
        );
      } else {
        // Standard mode: Three-pass decomposition
        engine = new IterativeDecompositionEngine(
          llmProvider,
          htmlExtractor,
          parser,
          model,
          verbose
        );
      }

      // Generate OXTest commands for each job using HTML context
      const oxtestLines: string[] = [];
      oxtestLines.push(`# ${testName} - Generated from YAML`);
      oxtestLines.push('');

      // Add initial navigation
      oxtestLines.push(`navigate url=${baseUrl}`);
      oxtestLines.push('');

      // Process each job with current page context
      for (let i = 0; i < jobs.length; i++) {
        const job = jobs[i];
        oxtestLines.push(`# Step: ${job.name}`);

        if (verbose) {
          console.log(`\n   📋 Processing job ${i + 1}/${jobs.length}: "${job.name}"`);
        }

        // Build instruction with acceptance criteria
        let instruction = job.prompt;
        if (job.acceptance && job.acceptance.length > 0) {
          instruction += '\nAcceptance criteria: ' + job.acceptance.join(', ');
        }

        if (verbose) {
          console.log(`   📝 Instruction: ${job.prompt}`);
          if (job.acceptance && job.acceptance.length > 0) {
            console.log(`   ✓ Acceptance: ${job.acceptance.join(', ')}`);
          }
        }

        try {
          // Decompose this step using current page HTML
          const subtask = await engine.decompose(instruction);

          // Convert commands to OXTest format
          for (const command of subtask.commands) {
            const line = this.commandToOXTestLine(command);
            if (line) {
              oxtestLines.push(line);
            }
          }

          // Note: We don't execute commands here because the decomposition engine
          // already sees the current page state. Each job decomposition gets fresh HTML.
        } catch (error) {
          console.warn(
            `   ⚠️  Warning: Could not decompose step "${job.name}": ${(error as Error).message}`
          );
          oxtestLines.push(`# Error: Could not decompose this step`);
          oxtestLines.push(`# Manual implementation required for: ${job.prompt}`);
        }

        oxtestLines.push('');
      }

      return oxtestLines.join('\n');
    } finally {
      await page.close();
      await context.close();
      await browser.close();
    }
  }

  /**
   * Converts an OxtestCommand to an OXTest format line
   */
  private commandToOXTestLine(command: any): string {
    const parts: string[] = [command.type];

    // Add selector if present
    if (command.selector) {
      const selectorStr = `${command.selector.strategy}=${command.selector.value}`;
      parts.push(selectorStr);

      // Add fallback if present
      if (command.selector.fallbacks && command.selector.fallbacks.length > 0) {
        const fallback = command.selector.fallbacks[0];
        parts.push(`fallback=${fallback.strategy}=${fallback.value}`);
      }
    }

    // Add parameters
    for (const [key, value] of Object.entries(command.params || {})) {
      if (value !== undefined && value !== null) {
        // Quote values with spaces
        const valueStr = String(value).includes(' ') ? `"${value}"` : String(value);
        parts.push(`${key}=${valueStr}`);
      }
    }

    return parts.join(' ');
  }

  /**
   * Serializes OxtestCommand array back to OXTest format
   */
  private serializeCommandsToOXTest(commands: OxtestCommand[]): string {
    const lines: string[] = [];

    for (const command of commands) {
      const line = this.commandToOXTestLine(command);
      if (line) {
        lines.push(line);
      }
    }

    return lines.join('\n');
  }

  /**
   * Validates OXTest by executing it step-by-step with self-healing
   */
  private async validateAndHealOXTest(
    oxtestFilePath: string,
    _testName: string,
    llmProvider: ILLMProvider,
    verbose: boolean
  ): Promise<{ content: string; updated: boolean; healedCount: number }> {
    const parser = new OxtestParser();
    const commands = await parser.parseFile(oxtestFilePath);
    let updated = false;
    let healedCount = 0;

    if (commands.length === 0) {
      return { content: '', updated: false, healedCount: 0 };
    }

    // Initialize executor with LLM provider for refinement
    const executor = new PlaywrightExecutor(verbose, llmProvider);

    try {
      console.log('   🔍 Validating OXTest by execution...');
      await executor.initialize();

      // Execute commands one by one
      const refinedCommands: OxtestCommand[] = [];

      for (let i = 0; i < commands.length; i++) {
        const command = commands[i];

        if (verbose) {
          console.log(`      Step ${i + 1}/${commands.length}: ${command.type}`);
        }

        const result = await executor.execute(command);

        if (result.success) {
          // Use refined command if available, otherwise original
          if (result.refined && result.refinedCommand) {
            refinedCommands.push(result.refinedCommand);
            updated = true;
            healedCount++;

            if (verbose) {
              console.log(`      ✏️  Command healed with refined selector`);
            }
          } else {
            refinedCommands.push(command);
          }
        } else {
          // Command failed even after refinement attempts
          console.log(`      ❌ Step ${i + 1} failed: ${result.error}`);
          throw new Error(`Validation failed at step ${i + 1}: ${result.error}`);
        }
      }

      // Serialize refined commands back to OXTest format
      if (updated) {
        const newContent = this.serializeCommandsToOXTest(refinedCommands);
        return { content: newContent, updated: true, healedCount };
      }

      return {
        content: fs.readFileSync(oxtestFilePath, 'utf-8'),
        updated: false,
        healedCount: 0,
      };
    } finally {
      await executor.close();
    }
  }

  private async executeTests(
    outputDir: string,
    reporterTypes: string,
    verbose?: boolean,
    testsPattern?: string,
    llmProvider?: ILLMProvider
  ): Promise<void> {
    // Find all .ox.test files
    let oxtestFiles = fs.readdirSync(outputDir).filter(f => f.endsWith('.ox.test'));

    // Apply pattern filter if specified
    if (testsPattern) {
      oxtestFiles = oxtestFiles.filter(f => minimatch(f, testsPattern));

      if (verbose) {
        console.log(`🔍 Filtering tests with pattern: ${testsPattern}`);
      }
    }

    if (oxtestFiles.length === 0) {
      if (testsPattern) {
        console.log(`⚠️  No .ox.test files found matching pattern: ${testsPattern}`);
      } else {
        console.log('⚠️  No .ox.test files found to execute');
      }
      return;
    }

    console.log(`📋 Found ${oxtestFiles.length} test file(s) to execute`);

    // Initialize executor with LLM provider for selector refinement
    const executor = new PlaywrightExecutor(verbose, llmProvider);
    const parser = new OxtestParser();

    try {
      console.log('🌐 Launching browser...');
      await executor.initialize();

      // TestOrchestrator needs ExecutionContextManager
      const { ExecutionContextManager } = await import(
        './application/orchestrators/ExecutionContextManager'
      );
      const contextManager = new ExecutionContextManager();
      const orchestrator = new TestOrchestrator(executor, contextManager);

      // Execute each test file
      for (const oxtestFile of oxtestFiles) {
        const filePath = path.join(outputDir, oxtestFile);
        const testName = oxtestFile.replace('.ox.test', '');

        console.log(`\n🧪 Executing: ${testName}`);

        try {
          // Parse the .ox.test file
          const commands = await parser.parseFile(filePath);

          if (commands.length === 0) {
            console.log(`   ⚠️  No commands found in ${oxtestFile}`);
            continue;
          }

          // Create a single subtask with all commands
          const subtask = new Subtask('main', testName, Array.from(commands));

          // Execute the subtask
          const startTime = new Date();
          subtask.markInProgress();

          const subtaskResult = await orchestrator.executeSubtask(subtask);

          if (subtaskResult.success) {
            subtask.markCompleted({
              success: true,
              output: `Executed ${subtaskResult.commandsExecuted} commands`,
            });
            console.log(`   ✅ Test passed (${subtaskResult.duration}ms)`);
          } else {
            subtask.markFailed(new Error(subtaskResult.error || 'Execution failed'));
            console.log(`   ❌ Test failed: ${subtaskResult.error}`);
          }

          const endTime = new Date();

          // Generate reports
          const report = ReportAdapter.subtasksToExecutionReport(
            testName,
            [subtask],
            startTime,
            endTime
          );

          // Write reports for requested types
          const reporters = reporterTypes.split(',').map(t => t.trim());
          for (const reporterType of reporters) {
            try {
              const reporter = createReporter(reporterType);
              const reportPath = path.join(outputDir, `${testName}.${reporter.fileExtension}`);

              await reporter.writeToFile(report, reportPath);
              console.log(`   📄 Report: ${testName}.${reporter.fileExtension}`);
            } catch (error) {
              console.error(
                `   ⚠️  Failed to generate ${reporterType} report: ${(error as Error).message}`
              );
            }
          }
        } catch (error) {
          console.error(`   ❌ Execution failed: ${(error as Error).message}`);
          if (verbose) {
            console.error('   Stack trace:', (error as Error).stack);
          }
        }
      }

      console.log('\n✅ Test execution completed!');
    } finally {
      // Cleanup
      await executor.close();
    }
  }

  public async execute(): Promise<void> {
    await this.program.parseAsync(process.argv);
  }
}

// Run CLI
const cli = new CLI();
cli.execute().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
