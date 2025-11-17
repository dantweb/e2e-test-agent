#!/usr/bin/env node
/**
 * Execute OXTest File Directly (JavaScript version)
 */

const fs = require('fs');
const path = require('path');

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error('Usage: node execute-oxtest-direct.js <oxtest-file> [output-dir]');
    console.error('');
    console.error('Example:');
    console.error('  node execute-oxtest-direct.js demo/_generated_result/example_output.ox.test');
    process.exit(1);
  }

  const oxtestFile = args[0];
  const outputDir = args[1] || path.dirname(oxtestFile);

  if (!fs.existsSync(oxtestFile)) {
    console.error(`❌ Error: File not found: ${oxtestFile}`);
    process.exit(1);
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('   E2E Test Agent - Execute OXTest File');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
  console.log(`📄 OXTest file: ${oxtestFile}`);
  console.log(`📁 Output dir: ${outputDir}`);
  console.log('');

  const testName = path.basename(oxtestFile, '.ox.test');

  // Import compiled modules
  const { OxtestParser } = require('./dist/infrastructure/parsers/OxtestParser');
  const { PlaywrightExecutor } = require('./dist/infrastructure/executors/PlaywrightExecutor');
  const { TestOrchestrator } = require('./dist/application/orchestrators/TestOrchestrator');
  const { ExecutionContextManager } = require('./dist/application/orchestrators/ExecutionContextManager');
  const { Subtask } = require('./dist/domain/entities/Subtask');
  const { ReportAdapter } = require('./dist/application/orchestrators/ReportAdapter');
  const { createReporter } = require('./dist/presentation/reporters');

  const parser = new OxtestParser();
  const executor = new PlaywrightExecutor();

  try {
    // Parse OXTest file
    console.log('📝 Parsing OXTest file...');
    const commands = await parser.parseFile(oxtestFile);
    console.log(`   ✓ Parsed ${commands.length} commands`);
    console.log('');

    // Initialize browser
    console.log('🌐 Launching browser...');
    await executor.initialize();
    console.log('   ✓ Browser ready');
    console.log('');

    // Execute test
    console.log('🧪 Executing test...');
    const startTime = Date.now();

    const contextManager = new ExecutionContextManager();
    const orchestrator = new TestOrchestrator(executor, contextManager);

    // Create a subtask from commands
    const subtask = new Subtask(
      testName,
      `Executing ${testName}`,
      commands
    );

    const result = await orchestrator.executeSubtaskWithStateTracking(subtask);
    const duration = Date.now() - startTime;

    console.log('');
    if (result.success) {
      console.log(`✅ Test PASSED (${duration}ms)`);
    } else {
      console.log(`❌ Test FAILED (${duration}ms)`);
      if (result.error) {
        console.log(`   Error: ${result.error}`);
      }
    }
    console.log('');

    // Generate reports
    console.log('📊 Generating reports...');

    const executionReport = ReportAdapter.subtasksToExecutionReport(
      testName,
      [subtask],
      new Date(startTime),
      new Date(Date.now())
    );

    // HTML Report
    const htmlReporter = createReporter('html');
    const htmlPath = path.join(outputDir, 'report.html');
    await htmlReporter.writeToFile(executionReport, htmlPath);
    console.log(`   ✓ HTML: ${htmlPath}`);

    // JSON Report
    const jsonReporter = createReporter('json');
    const jsonPath = path.join(outputDir, 'report.json');
    await jsonReporter.writeToFile(executionReport, jsonPath);
    console.log(`   ✓ JSON: ${jsonPath}`);

    // JUnit Report
    const junitReporter = createReporter('junit');
    const junitPath = path.join(outputDir, 'junit.xml');
    await junitReporter.writeToFile(executionReport, junitPath);
    console.log(`   ✓ JUnit: ${junitPath}`);

    // Console Report
    const consoleReporter = createReporter('console');
    const consoleOutput = await consoleReporter.generate(executionReport);
    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(consoleOutput);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // Cleanup
    if (executor.browser) {
      await executor.browser.close();
    }

    process.exit(result.success ? 0 : 1);

  } catch (error) {
    console.error('');
    console.error('❌ Error during execution:');
    console.error(error);

    if (executor.browser) {
      await executor.browser.close();
    }

    process.exit(1);
  }
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
