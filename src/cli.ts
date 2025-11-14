#!/usr/bin/env node

/**
 * E2E Test Agent CLI
 *
 * Generates Playwright tests (.spec.ts files) from high-level YAML specifications using LLM.
 * The YAML format supports job/prompt/acceptance structure.
 * Jobs within a test are executed sequentially in the same browser session.
 *
 * Output formats:
 * - .spec.ts: Standard Playwright test files (default)
 * - .ox.test: Intermediate format using OXTest commands (for debugging)
 *   Commands defined in: src/domain/enums/CommandType.ts
 */

import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'yaml';
import { OpenAI } from 'openai';
import { OpenAILLMProvider } from './infrastructure/llm/OpenAILLMProvider';
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
    env?: string;
    verbose?: boolean;
  }): Promise<void> {
    try {
      // Validate required options
      if (!options.src) {
        console.error('❌ Error: --src option is required');
        console.error('Usage: e2e-test-agent --src=<yaml-file> --output=<directory>');
        process.exit(1);
      }

      // Load environment variables
      this.loadEnvironment(options.env);

      // Verify API key
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        console.error('❌ Error: OPENAI_API_KEY environment variable not set');
        console.error('Please set OPENAI_API_KEY or provide an .env file with --env');
        process.exit(1);
      }

      if (options.verbose) {
        console.log('🔧 Configuration:');
        console.log(`   Source: ${options.src}`);
        console.log(`   Output: ${options.output}`);
        console.log(`   Format: ${options.format}`);
        console.log(`   API URL: ${process.env.OPENAI_API_URL || 'https://api.openai.com/v1'}`);
        console.log(`   Model: ${process.env.OPENAI_MODEL || 'gpt-4o'}`);
        console.log('');
      }

      // Read and parse YAML
      console.log(`📝 Reading YAML specification: ${options.src}`);
      const yamlContent = fs.readFileSync(options.src, 'utf-8');
      const spec: HighLevelYaml = yaml.parse(yamlContent);

      // Initialize LLM provider
      console.log('🤖 Initializing LLM provider...');
      const apiUrl = process.env.OPENAI_API_URL || 'https://api.openai.com/v1';
      const openaiClient = new OpenAI({
        apiKey: apiKey,
        baseURL: apiUrl,
        timeout: 60000,
      });
      const llmProvider = new OpenAILLMProvider(apiKey, openaiClient);

      // Create output directory
      if (!fs.existsSync(options.output)) {
        fs.mkdirSync(options.output, { recursive: true });
      }

      // Process each test suite in YAML
      for (const [testName, testSpec] of Object.entries(spec)) {
        console.log(`\n🎯 Processing test: ${testName}`);
        console.log(`   URL: ${testSpec.url}`);
        console.log(`   Jobs: ${testSpec.jobs.length}`);

        // Generate a single test file with all jobs as sequential steps
        console.log('   🧠 Generating test with all jobs...');
        const testCode = await this.generateSequentialTestWithLLM(
          llmProvider,
          testName,
          testSpec.jobs,
          testSpec.url
        );

        // Generate single test file
        const testFileName = `${testName}.spec.ts`;
        const testFilePath = path.join(options.output, testFileName);

        fs.writeFileSync(testFilePath, testCode, 'utf-8');

        console.log(`   📄 Created: ${testFileName}`);
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

  private async generateSequentialTestWithLLM(
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
