#!/usr/bin/env node

/**
 * Main entry point for e2e-tester-agent
 * This file is used when running the CLI
 */

export const version = '1.0.0';

// If run directly as a script, execute the CLI
if (require.main === module) {
  // Import and run CLI
  require('./cli');
}
