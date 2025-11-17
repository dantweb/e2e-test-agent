/**
 * Complete End-to-End Workflow Tests
 *
 * Sprint 9: Comprehensive E2E test coverage
 *
 * These tests verify the complete workflow from YAML input to test execution and reporting:
 * 1. YAML parsing and validation
 * 2. Task decomposition
 * 3. TaskGraph construction with dependencies
 * 4. State-aware execution
 * 5. Multiple report format generation
 */

import { TaskDecomposer } from '../../src/application/engines/TaskDecomposer';
import { TestOrchestrator } from '../../src/application/orchestrators/TestOrchestrator';
import { ExecutionContextManager } from '../../src/application/orchestrators/ExecutionContextManager';
import { ReportAdapter } from '../../src/application/orchestrators/ReportAdapter';
import { createReporter } from '../../src/presentation/reporters';
import { Task } from '../../src/domain/entities/Task';
import { Subtask } from '../../src/domain/entities/Subtask';
import { OxtestCommand } from '../../src/domain/entities/OxtestCommand';
import { SelectorSpec } from '../../src/domain/entities/SelectorSpec';
import { TaskStatus } from '../../src/domain/enums/TaskStatus';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

describe('Complete E2E Workflow (Sprint 9)', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'e2e-workflow-'));
  });

  afterEach(async () => {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('Task Execution and State Tracking Workflow', () => {
    it('should decompose tasks and track execution state end-to-end', async () => {
      // Step 1: Create task and subtasks
      const subtask = new Subtask('subtask-1', 'Navigate and verify', [
        new OxtestCommand('navigate', { url: 'https://example.com' }),
      ]);

      expect(subtask.status).toBe(TaskStatus.Pending);

      // Step 2: Verify state tracking
      subtask.markInProgress();
      expect(subtask.status).toBe(TaskStatus.InProgress);
      expect(subtask.isInProgress()).toBe(true);

      // Step 3: Mark as completed
      subtask.markCompleted({
        success: true,
        timestamp: new Date(),
        metadata: { commandsExecuted: 1 },
      });

      expect(subtask.status).toBe(TaskStatus.Completed);
      expect(subtask.isCompleted()).toBe(true);
      expect(subtask.result?.success).toBe(true);
    });

    it('should build dependency graph and verify topological order', () => {
      // Step 1: Create subtasks with dependencies
      const subtasks = [
        new Subtask('setup', 'Setup test environment', [
          new OxtestCommand('navigate', { url: 'https://example.com/setup' }),
        ]),
        new Subtask('test-feature-a', 'Test feature A', [
          new OxtestCommand('click', {}, new SelectorSpec('css', '#feature-a')),
        ]),
        new Subtask('test-feature-b', 'Test feature B', [
          new OxtestCommand('click', {}, new SelectorSpec('css', '#feature-b')),
        ]),
        new Subtask('verify', 'Verify results', [
          new OxtestCommand('assertVisible', {}, new SelectorSpec('css', '.success')),
        ]),
      ];

      // Step 2: Define dependencies
      const dependencies = new Map<string, string[]>([
        ['test-feature-a', ['setup']],
        ['test-feature-b', ['setup']],
        ['verify', ['test-feature-a', 'test-feature-b']],
      ]);

      // Step 3: Build graph using TaskDecomposer
      const mockEngine = {
        decompose: jest.fn(),
      } as any;

      const decomposer = new TaskDecomposer(mockEngine);
      const graph = decomposer.buildTaskGraph(subtasks, dependencies);

      // Step 4: Verify graph properties
      expect(graph.size()).toBe(4);
      expect(graph.hasCycle()).toBe(false);

      // Step 5: Verify topological order
      const order = graph.topologicalSort();
      expect(order[0]).toBe('setup'); // Must be first
      expect(order[3]).toBe('verify'); // Must be last

      // feature-a and feature-b can be in any order (parallel)
      const middleNodes = order.slice(1, 3);
      expect(middleNodes).toContain('test-feature-a');
      expect(middleNodes).toContain('test-feature-b');

      // Step 6: Verify executable nodes
      let completed = new Set<string>();
      let executable = graph.getExecutableNodes(completed);
      expect(executable).toEqual(['setup']); // Only setup can run initially

      completed.add('setup');
      executable = graph.getExecutableNodes(completed);
      expect(executable).toContain('test-feature-a');
      expect(executable).toContain('test-feature-b');

      completed.add('test-feature-a');
      completed.add('test-feature-b');
      executable = graph.getExecutableNodes(completed);
      expect(executable).toEqual(['verify']); // Only verify left
    });

    it('should handle task failure and block remaining subtasks', async () => {
      // Step 1: Create task with multiple subtasks
      const subtasks = [
        new Subtask('step-1', 'First step', [
          new OxtestCommand('navigate', { url: 'https://example.com' }),
        ]),
        new Subtask('step-2', 'Second step (will fail)', [
          new OxtestCommand('click', {}, new SelectorSpec('css', '#nonexistent')),
        ]),
        new Subtask('step-3', 'Third step (will be blocked)', [
          new OxtestCommand('assertVisible', {}, new SelectorSpec('css', '.result')),
        ]),
      ];

      const task = new Task('multi-step-test', 'Multi-step test', ['step-1', 'step-2', 'step-3']);

      // Step 2: Mock executor (success, failure, should-not-run)
      const mockExecutor = {
        execute: jest
          .fn()
          .mockResolvedValueOnce({ success: true, duration: 10 })
          .mockResolvedValueOnce({ success: false, error: 'Element not found', duration: 5 }),
      } as any;

      const contextManager = new ExecutionContextManager();
      const orchestrator = new TestOrchestrator(mockExecutor, contextManager);

      // Step 3: Execute with state tracking
      const result = await orchestrator.executeTaskWithStateTracking(task, subtasks);

      // Step 4: Verify results
      expect(result.success).toBe(false);
      expect(result.subtasksExecuted).toBe(2);

      // Step 5: Verify subtask states
      expect(subtasks[0].status).toBe(TaskStatus.Completed);
      expect(subtasks[0].isCompleted()).toBe(true);

      expect(subtasks[1].status).toBe(TaskStatus.Failed);
      expect(subtasks[1].isFailed()).toBe(true);

      expect(subtasks[2].status).toBe(TaskStatus.Blocked);
      expect(subtasks[2].isBlocked()).toBe(true);

      // Step 6: Verify only 2 commands were executed (step-3 was blocked)
      expect(mockExecutor.execute).toHaveBeenCalledTimes(2);
    });
  });

  describe('Report Generation Integration', () => {
    it('should generate multiple report formats from execution results', async () => {
      // Step 1: Create completed subtasks
      const subtask1 = new Subtask('test-1', 'Successful test', [
        new OxtestCommand('navigate', { url: 'https://example.com' }),
      ]);
      subtask1.markInProgress();
      subtask1.markCompleted({
        success: true,
        timestamp: new Date(),
        duration: 100,
      });

      const subtask2 = new Subtask('test-2', 'Failed test', [
        new OxtestCommand('click', {}, new SelectorSpec('css', '#missing')),
      ]);
      subtask2.markInProgress();
      subtask2.markFailed(new Error('Element not found'), {
        duration: 50,
        timestamp: new Date(),
      });

      // Step 2: Convert to execution report
      const subtaskResults = [
        {
          success: true,
          subtaskId: 'test-1',
          commandsExecuted: 1,
          duration: 100,
        },
        {
          success: false,
          subtaskId: 'test-2',
          commandsExecuted: 1,
          duration: 50,
          error: 'Element not found',
        },
      ];

      const taskResult = {
        success: false,
        taskId: 'test-task',
        subtasksExecuted: 2,
        duration: 150,
      };

      const executionReport = ReportAdapter.taskToExecutionReport(
        'Report Generation Test',
        taskResult,
        subtaskResults,
        [subtask1, subtask2]
      );

      // Step 3: Generate reports
      const htmlReporter = createReporter('html');
      const jsonReporter = createReporter('json');
      const junitReporter = createReporter('junit');
      const consoleReporter = createReporter('console');

      const reports = {
        html: await htmlReporter.generate(executionReport),
        json: await jsonReporter.generate(executionReport),
        junit: await junitReporter.generate(executionReport),
        console: await consoleReporter.generate(executionReport),
      };

      // Step 4: Verify HTML report
      expect(reports.html).toContain('<!DOCTYPE html>');
      expect(reports.html).toContain('test-1');
      expect(reports.html).toContain('test-2');

      // Step 5: Verify JSON report
      const jsonReport = JSON.parse(reports.json);
      expect(jsonReport.totalSubtasks).toBe(2);
      expect(jsonReport.passed).toBe(1);
      expect(jsonReport.failed).toBe(1);
      expect(jsonReport.subtaskReports).toHaveLength(2);

      // Step 6: Verify JUnit report
      expect(reports.junit).toContain('<?xml version');
      expect(reports.junit).toContain('<testsuite');
      expect(reports.junit).toContain('tests="2"');

      // Step 7: Verify Console report
      expect(reports.console).toBeDefined();
      expect(reports.console.length).toBeGreaterThan(0);
      expect(reports.console).toContain('Report Generation Test');
    });

    it('should write reports to disk in different formats', async () => {
      // Step 1: Create simple execution results
      const subtaskResult = {
        success: true,
        subtaskId: 'test-1',
        commandsExecuted: 3,
        duration: 1000,
      };

      const taskResult = {
        success: true,
        taskId: 'test-task',
        subtasksExecuted: 1,
        duration: 1000,
      };

      const executionReport = ReportAdapter.taskToExecutionReport('File Writing Test', taskResult, [
        subtaskResult,
      ]);

      // Step 2: Generate HTML report
      const htmlReporter = createReporter('html');
      const htmlContent = await htmlReporter.generate(executionReport);
      const htmlPath = path.join(tempDir, 'report.html');
      await fs.writeFile(htmlPath, htmlContent, 'utf-8');

      // Step 3: Verify HTML file exists and has content
      const htmlStats = await fs.stat(htmlPath);
      expect(htmlStats.isFile()).toBe(true);
      expect(htmlStats.size).toBeGreaterThan(0);

      const readHtml = await fs.readFile(htmlPath, 'utf-8');
      expect(readHtml).toContain('<!DOCTYPE html>');
      expect(readHtml).toContain('test-1');

      // Step 4: Generate JSON report
      const jsonReporter = createReporter('json');
      const jsonContent = await jsonReporter.generate(executionReport);
      const jsonPath = path.join(tempDir, 'report.json');
      await fs.writeFile(jsonPath, jsonContent, 'utf-8');

      const jsonStats = await fs.stat(jsonPath);
      expect(jsonStats.isFile()).toBe(true);

      const readJson = await fs.readFile(jsonPath, 'utf-8');
      const parsed = JSON.parse(readJson);
      expect(parsed.testName).toBeDefined();
      expect(parsed.totalSubtasks).toBe(1);
      expect(parsed.passed).toBe(1);
      expect(parsed.subtaskReports).toHaveLength(1);

      // Step 5: Generate JUnit report
      const junitReporter = createReporter('junit');
      const junitContent = await junitReporter.generate(executionReport);
      const junitPath = path.join(tempDir, 'report.xml');
      await fs.writeFile(junitPath, junitContent, 'utf-8');

      const junitStats = await fs.stat(junitPath);
      expect(junitStats.isFile()).toBe(true);

      const readJunit = await fs.readFile(junitPath, 'utf-8');
      expect(readJunit).toContain('<?xml version');
      expect(readJunit).toContain('<testsuite');
    });
  });

  describe('Error Scenarios', () => {
    it('should handle cycle detection in task dependencies', () => {
      const subtasks = [
        new Subtask('a', 'Task A', [new OxtestCommand('wait', { duration: 100 })]),
        new Subtask('b', 'Task B', [new OxtestCommand('wait', { duration: 100 })]),
        new Subtask('c', 'Task C', [new OxtestCommand('wait', { duration: 100 })]),
      ];

      // Create cycle: a → b → c → a
      const dependencies = new Map<string, string[]>([
        ['b', ['a']],
        ['c', ['b']],
        ['a', ['c']], // Creates cycle
      ]);

      const mockEngine = { decompose: jest.fn() } as any;
      const decomposer = new TaskDecomposer(mockEngine);

      expect(() => {
        decomposer.buildTaskGraph(subtasks, dependencies);
      }).toThrow(/cycle/i);
    });

    it('should handle missing dependency errors', () => {
      const subtasks = [new Subtask('a', 'Task A', [new OxtestCommand('wait', { duration: 100 })])];

      const dependencies = new Map<string, string[]>([
        ['a', ['nonexistent']], // References non-existent dependency
      ]);

      const mockEngine = { decompose: jest.fn() } as any;
      const decomposer = new TaskDecomposer(mockEngine);

      expect(() => {
        decomposer.buildTaskGraph(subtasks, dependencies);
      }).toThrow(/does not exist/i);
    });

    it('should handle invalid state transitions', () => {
      const subtask = new Subtask('test', 'Test task', [
        new OxtestCommand('navigate', { url: 'https://example.com' }),
      ]);

      // Mark as completed
      subtask.markInProgress();
      subtask.markCompleted({ success: true, timestamp: new Date() });

      // Try to mark as in progress again (invalid transition)
      expect(() => {
        subtask.markInProgress();
      }).toThrow(/Invalid state transition/);
    });
  });

  describe('Complex Workflows', () => {
    it('should handle multi-step workflow with setup and teardown', async () => {
      // Setup commands
      const setupCmd = new OxtestCommand('navigate', { url: 'https://example.com/setup' });
      const teardownCmd = new OxtestCommand('navigate', { url: 'https://example.com/cleanup' });

      // Main subtasks
      const subtasks = [
        new Subtask('login', 'Login', [
          new OxtestCommand('navigate', { url: 'https://example.com/login' }),
          new OxtestCommand('type', { value: 'user' }, new SelectorSpec('css', '#username')),
          new OxtestCommand('click', {}, new SelectorSpec('css', '#login-btn')),
        ]),
        new Subtask('perform-action', 'Perform action', [
          new OxtestCommand('click', {}, new SelectorSpec('css', '#action-btn')),
        ]),
        new Subtask('verify', 'Verify result', [
          new OxtestCommand('assertVisible', {}, new SelectorSpec('css', '.success')),
        ]),
      ];

      const task = new Task(
        'complex-test',
        'Complex multi-step test',
        ['login', 'perform-action', 'verify'],
        [setupCmd],
        [teardownCmd]
      );

      // Mock executor - all succeed
      const mockExecutor = {
        execute: jest.fn().mockResolvedValue({ success: true, duration: 10 }),
      } as any;

      const contextManager = new ExecutionContextManager();
      const orchestrator = new TestOrchestrator(mockExecutor, contextManager);

      const result = await orchestrator.executeTaskWithStateTracking(task, subtasks);

      // Verify success
      expect(result.success).toBe(true);
      expect(result.subtasksExecuted).toBe(3);

      // Verify all subtasks completed
      expect(subtasks.every(s => s.isCompleted())).toBe(true);

      // Verify correct number of command executions
      // setup (1) + login (3) + perform (1) + verify (1) + teardown (1) = 7
      expect(mockExecutor.execute).toHaveBeenCalledTimes(7);
    });

    it('should execute teardown even when subtask fails', async () => {
      const teardownCmd = new OxtestCommand('navigate', { url: 'https://example.com/cleanup' });

      const subtask = new Subtask('failing-test', 'This will fail', [
        new OxtestCommand('click', {}, new SelectorSpec('css', '#nonexistent')),
      ]);

      const task = new Task(
        'test-with-teardown',
        'Test with teardown',
        ['failing-test'],
        undefined,
        [teardownCmd]
      );

      const mockExecutor = {
        execute: jest
          .fn()
          .mockResolvedValueOnce({ success: false, error: 'Not found', duration: 5 })
          .mockResolvedValueOnce({ success: true, duration: 10 }), // teardown
      } as any;

      const contextManager = new ExecutionContextManager();
      const orchestrator = new TestOrchestrator(mockExecutor, contextManager);

      const result = await orchestrator.executeTaskWithStateTracking(task, [subtask]);

      // Test failed
      expect(result.success).toBe(false);
      expect(subtask.isFailed()).toBe(true);

      // But teardown was executed
      expect(mockExecutor.execute).toHaveBeenCalledTimes(2);
    });
  });
});
