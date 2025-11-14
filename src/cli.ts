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
      .option('--oxtest', 'Also generate .ox.test files alongside Playwright tests', false)
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

        // Generate Playwright test file
        const testFileName = `${testName}.spec.ts`;
        const testFilePath = path.join(options.output, testFileName);
        fs.writeFileSync(testFilePath, testCode, 'utf-8');
        console.log(`   📄 Created: ${testFileName}`);

        // Generate OXTest file if --oxtest flag is set
        if (options.oxtest) {
          console.log('   🧠 Generating OXTest format...');
          const oxtestCode = await this.generateOXTestWithLLM(
            llmProvider,
            testName,
            testSpec.jobs,
            testSpec.url
          );

          const oxtestFileName = `${testName}.ox.test`;
          const oxtestFilePath = path.join(options.output, oxtestFileName);
          fs.writeFileSync(oxtestFilePath, oxtestCode, 'utf-8');
          console.log(`   📄 Created: ${oxtestFileName}`);
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

  private async generateOXTestWithLLM(
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

    const prompt = `Generate an OXTest format test file for the following test flow.

OXTest is a simple domain-specific language for E2E tests with these commands:

Commands:
- navigate url=<url>
- click <selector>
- type <selector> value=<value>
- select <selector> value=<value>
- wait timeout=<ms>
- wait_navigation timeout=<ms>
- hover <selector>
- press key=<key>
- screenshot path=<path>
- assert_visible <selector>
- assert_text <selector> text=<text>
- assert_value <selector> value=<value>
- assert_url pattern=<regex>
- assert_exists <selector>
- assert_not_exists <selector>

Selector formats:
- css=<css-selector>
- xpath=<xpath>
- text="<text>"
- role=<role>
- testid=<test-id>
- Multiple strategies: click css=.button fallback=text="Submit"

Test Name: ${testName}
Base URL: ${baseUrl}

Sequential Test Flow:
${jobDescriptions}

Requirements:
1. Use OXTest command syntax (one command per line)
2. Start with a comment: # ${testName} - Generated from YAML
3. Use navigate url=${baseUrl} to start
4. Use CSS selectors primarily, with text fallbacks
5. Add wait_navigation after actions that trigger page loads
6. Add assertions based on acceptance criteria
7. Use environment variables for dynamic values: \${VAR_NAME}
8. Add comments for each major step (# Step: <step-name>)
9. Keep commands atomic and clear
10. Use wait commands when elements need time to appear

Example format:
# Login to shop - Generated from YAML
navigate url=https://example.com
type css=input[name="username"] value=\${TEST_USERNAME}
type css=input[type="password"] value=\${TEST_PASSWORD}
click text="Login" fallback=css=button[type="submit"]
wait_navigation timeout=5000
assert_url pattern=.*/home
assert_not_exists css=.error

Generate ONLY the OXTest commands, no explanations. Use # for comments.`;

    const response = await llmProvider.generate(prompt, {
      model: process.env.OPENAI_MODEL || 'gpt-4o',
      temperature: 0.2,
      maxTokens: 2000,
    });

    // Clean up the response (remove markdown code blocks if present)
    let code = response.content.trim();
    if (code.startsWith('```oxtest') || code.startsWith('```')) {
      code = code.replace(/^```[a-z]*\n/, '').replace(/\n```$/, '');
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
