import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for E2E Test Agent generated tests
 * See https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  // Look for test files in the _generated directory and demo directory
  testDir: './',
  testMatch: '**/_generated*/**/*.spec.ts',

  // Maximum time one test can run
  timeout: 60000,

  // Test execution settings
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : 1,

  // Reporter to use
  reporter: [
    ['html', { outputFolder: 'test-results/html-report' }],
    ['list'],
  ],

  // Shared settings for all projects
  use: {
    // Base URL for tests
    baseURL: process.env.BASE_URL || 'https://osc2.oxid.shop',

    // Collect trace on failure
    trace: 'on-first-retry',

    // Screenshot on failure
    screenshot: 'only-on-failure',

    // Video on failure
    video: 'retain-on-failure',

    // Maximum time each action can take
    actionTimeout: 15000,

    // Navigation timeout
    navigationTimeout: 30000,
  },

  // Configure projects for different browsers
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    // Uncomment to test on other browsers
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },
  ],
});
