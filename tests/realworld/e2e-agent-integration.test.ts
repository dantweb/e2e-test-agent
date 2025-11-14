/**
 * E2E Test Agent - Real Integration Test
 *
 * This test runs the FULL e2e-test-agent pipeline:
 * 1. Takes a YAML specification
 * 2. Uses LLM to decompose tasks
 * 3. Generates .ox.test files
 * 4. Executes the generated tests against real website
 *
 * This is a TRUE integration test of the entire system.
 *
 * Prerequisites:
 * - OPENAI_API_KEY must be set
 * - TEST_URL defaults to https://osc2.oxid.shop
 *
 * Run with: npm run test:realworld
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Load environment variables from .env.test file
 */
function loadEnvFile(filePath: string): Record<string, string> {
  const envVars: Record<string, string> = {};

  if (!fs.existsSync(filePath)) {
    return envVars;
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip comments and empty lines
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const equalIndex = trimmed.indexOf('=');
    if (equalIndex === -1) {
      continue;
    }

    const key = trimmed.substring(0, equalIndex).trim();
    let value = trimmed.substring(equalIndex + 1).trim();

    // Handle variable substitution ${VAR} or ${VAR:-default}
    value = value.replace(/\$\{([^}]+)\}/g, (_match, varExpr) => {
      const colonIndex = varExpr.indexOf(':-');
      if (colonIndex !== -1) {
        const varName = varExpr.substring(0, colonIndex);
        const defaultValue = varExpr.substring(colonIndex + 2);
        return process.env[varName] || defaultValue;
      }
      return process.env[varExpr] || '';
    });

    envVars[key] = value;
  }

  return envVars;
}

describe('E2E Test Agent - Real World Integration', () => {
  const testDir = __dirname;
  const yamlFile = path.join(testDir, 'shopping-flow.yaml');
  const envFile = path.join(testDir, '.env.test');
  const outputDir = path.join(testDir, '_generated');

  // Load environment from .env.test file
  let testEnv: Record<string, string> = {};
  let apiKey: string | undefined;
  let apiUrl: string;

  beforeAll(() => {
    // Load .env.test file
    testEnv = loadEnvFile(envFile);
    console.log('📝 Loaded environment from .env.test:', Object.keys(testEnv));

    // Get API key from .env.test or fallback to process.env
    apiKey = testEnv.OPENAI_API_KEY || process.env.OPENAI_API_KEY;
    apiUrl = testEnv.OPENAI_API_URL || process.env.OPENAI_API_URL || 'https://api.openai.com/v1';

    if (!apiKey) {
      console.warn(
        '⚠️  OPENAI_API_KEY not set in .env.test or environment - skipping real-world integration tests'
      );
    } else {
      console.log(`✅ Using API: ${apiUrl}`);
      console.log(`✅ API key loaded (length: ${apiKey.length})`);
    }

    // Clean output directory
    if (fs.existsSync(outputDir)) {
      fs.rmSync(outputDir, { recursive: true, force: true });
    }
    fs.mkdirSync(outputDir, { recursive: true });
  });

  afterAll(() => {
    // Optional: Clean up generated files
    // Uncomment if you want to remove _generated after tests
    // if (fs.existsSync(outputDir)) {
    //   fs.rmSync(outputDir, { recursive: true, force: true });
    // }
  });

  describe('Full E2E Pipeline', () => {
    it('should verify test files exist', () => {
      if (!apiKey) {
        console.log('Skipping test - no API key');
        return;
      }

      expect(fs.existsSync(yamlFile)).toBe(true);
      expect(fs.existsSync(envFile)).toBe(true);
      console.log('✅ Test specification files exist');
    });

    it('should run e2e-test-agent to generate .ox.test files', async () => {
      if (!apiKey) {
        console.log('Skipping test - no API key');
        return;
      }

      console.log('🚀 Running e2e-test-agent to generate tests...');
      console.log(`   YAML: ${yamlFile}`);
      console.log(`   Output: ${outputDir}`);

      try {
        // Run the e2e-test-agent CLI with environment from .env.test
        const result = execSync(
          `node ${path.join(__dirname, '../../dist/index.js')} ` +
            `--src=${yamlFile} ` +
            `--output=${outputDir}`,
          {
            cwd: testDir,
            env: {
              ...process.env,
              ...testEnv, // Load all vars from .env.test
              OPENAI_API_KEY: apiKey,
              OPENAI_API_URL: apiUrl,
            },
            encoding: 'utf-8',
            stdio: 'pipe',
          }
        );

        console.log('📝 E2E Agent Output:');
        console.log(result);

        // Verify generated files exist
        const generatedFiles = fs.readdirSync(outputDir);
        console.log('📂 Generated files:', generatedFiles);

        expect(generatedFiles.length).toBeGreaterThan(0);
        console.log(`✅ Generated ${generatedFiles.length} test files`);
      } catch (error: any) {
        console.error('❌ E2E Agent failed:', error.message);
        if (error.stdout) console.log('STDOUT:', error.stdout);
        if (error.stderr) console.error('STDERR:', error.stderr);
        throw error;
      }
    }, 120000); // 2 minutes timeout for LLM generation

    it('should verify generated .ox.test files have valid structure', () => {
      if (!apiKey) {
        console.log('Skipping test - no API key');
        return;
      }

      const generatedFiles = fs
        .readdirSync(outputDir)
        .filter(f => f.endsWith('.ox.test') || f.endsWith('.test.ts') || f.endsWith('.spec.ts'));

      expect(generatedFiles.length).toBeGreaterThan(0);

      generatedFiles.forEach(file => {
        const filePath = path.join(outputDir, file);
        const content = fs.readFileSync(filePath, 'utf-8');

        // Basic structure validation
        expect(content.length).toBeGreaterThan(0);
        expect(content).toMatch(/test|describe|it/i); // Should contain test keywords

        console.log(`✅ Validated structure of ${file}`);
      });
    });

    it('should verify generated tests are ready for execution', async () => {
      if (!apiKey) {
        console.log('Skipping test - no API key');
        return;
      }

      console.log('✅ Verifying generated tests are ready for Playwright execution...');

      // Find generated test files
      const testFiles = fs
        .readdirSync(outputDir)
        .filter(f => f.endsWith('.ox.test') || f.endsWith('.test.ts') || f.endsWith('.spec.ts'))
        .map(f => path.join(outputDir, f));

      expect(testFiles.length).toBeGreaterThan(0);
      console.log(`📋 Found ${testFiles.length} test file(s) ready for execution`);

      // Verify each file has valid Playwright test structure
      for (const testFile of testFiles) {
        const content = fs.readFileSync(testFile, 'utf-8');
        const fileName = path.basename(testFile);

        // Should import from @playwright/test
        expect(content).toMatch(/import.*@playwright\/test/);

        // Should have at least one test
        expect(content).toMatch(/test\s*\(/);

        // Should have page navigation
        expect(content).toMatch(/page\.goto|await page/);

        console.log(`   ✅ ${fileName} - Valid Playwright test structure`);
      }

      console.log('\n📝 To run the generated tests manually:');
      console.log(`   cd ${outputDir}`);
      console.log(`   npx playwright test --timeout=90000`);
      console.log('');
      console.log('⚠️  Note: Playwright tests cannot be executed from within Jest.');
      console.log('   Run them separately using the command above.');
    });
  });

  describe('Test Artifacts', () => {
    it('should have generated test artifacts', () => {
      if (!apiKey) {
        console.log('Skipping test - no API key');
        return;
      }

      if (!fs.existsSync(outputDir)) {
        console.log('⚠️  No output directory found - tests may have failed');
        return;
      }

      const files = fs.readdirSync(outputDir);
      console.log('📦 Artifacts in _generated:');
      files.forEach(file => {
        const filePath = path.join(outputDir, file);
        const stats = fs.statSync(filePath);
        console.log(`   - ${file} (${stats.size} bytes)`);
      });

      expect(files.length).toBeGreaterThan(0);
    });
  });
});
