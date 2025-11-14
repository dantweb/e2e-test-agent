import { ReportAdapter } from '../../../../src/application/orchestrators/ReportAdapter';
import { Subtask } from '../../../../src/domain/entities/Subtask';
import { OxtestCommand } from '../../../../src/domain/entities/OxtestCommand';
import { TaskStatus } from '../../../../src/domain/enums/TaskStatus';
import {
  TaskExecutionResult,
  SubtaskExecutionResult,
} from '../../../../src/application/orchestrators/TestOrchestrator';

describe('ReportAdapter', () => {
  describe('taskToExecutionReport', () => {
    it('should convert successful task execution to ExecutionReport', () => {
      const subtaskResults: SubtaskExecutionResult[] = [
        {
          success: true,
          subtaskId: 'sub-1',
          commandsExecuted: 3,
          duration: 1500,
        },
        {
          success: true,
          subtaskId: 'sub-2',
          commandsExecuted: 2,
          duration: 800,
        },
      ];

      const taskResult: TaskExecutionResult = {
        success: true,
        taskId: 'task-1',
        subtasksExecuted: 2,
        duration: 2500,
      };

      const report = ReportAdapter.taskToExecutionReport('Login Test', taskResult, subtaskResults);

      expect(report.testName).toBe('Login Test');
      expect(report.duration).toBe(2500);
      expect(report.totalSubtasks).toBe(2);
      expect(report.passed).toBe(2);
      expect(report.failed).toBe(0);
      expect(report.blocked).toBe(0);
      expect(report.success).toBe(true);
      expect(report.subtaskReports).toHaveLength(2);
    });

    it('should convert failed task execution to ExecutionReport', () => {
      const subtaskResults: SubtaskExecutionResult[] = [
        {
          success: true,
          subtaskId: 'sub-1',
          commandsExecuted: 3,
          duration: 1500,
        },
        {
          success: false,
          subtaskId: 'sub-2',
          commandsExecuted: 1,
          duration: 500,
          error: 'Element not found',
        },
      ];

      const taskResult: TaskExecutionResult = {
        success: false,
        taskId: 'task-1',
        subtasksExecuted: 2,
        duration: 2000,
        error: 'Subtask execution failed',
      };

      const report = ReportAdapter.taskToExecutionReport('Login Test', taskResult, subtaskResults);

      expect(report.testName).toBe('Login Test');
      expect(report.passed).toBe(1);
      expect(report.failed).toBe(1);
      expect(report.success).toBe(false);
      expect(report.subtaskReports[1].error).toBe('Element not found');
    });

    it('should include subtask descriptions from Subtask entities', () => {
      const commands = [new OxtestCommand('navigate', { url: 'https://example.com' })];
      const subtask1 = new Subtask('sub-1', 'Navigate to homepage', commands);
      const subtask2 = new Subtask('sub-2', 'Click login button', commands);

      const subtaskResults: SubtaskExecutionResult[] = [
        {
          success: true,
          subtaskId: 'sub-1',
          commandsExecuted: 1,
          duration: 1000,
        },
        {
          success: true,
          subtaskId: 'sub-2',
          commandsExecuted: 1,
          duration: 500,
        },
      ];

      const taskResult: TaskExecutionResult = {
        success: true,
        taskId: 'task-1',
        subtasksExecuted: 2,
        duration: 1500,
      };

      const report = ReportAdapter.taskToExecutionReport('Login Test', taskResult, subtaskResults, [
        subtask1,
        subtask2,
      ]);

      expect(report.subtaskReports[0].description).toBe('Navigate to homepage');
      expect(report.subtaskReports[1].description).toBe('Click login button');
    });

    it('should use subtask ID as description if subtask not provided', () => {
      const subtaskResults: SubtaskExecutionResult[] = [
        {
          success: true,
          subtaskId: 'sub-unknown',
          commandsExecuted: 1,
          duration: 1000,
        },
      ];

      const taskResult: TaskExecutionResult = {
        success: true,
        taskId: 'task-1',
        subtasksExecuted: 1,
        duration: 1000,
      };

      const report = ReportAdapter.taskToExecutionReport('Test', taskResult, subtaskResults);

      expect(report.subtaskReports[0].description).toBe('sub-unknown');
    });

    it('should include commands executed in output', () => {
      const subtaskResults: SubtaskExecutionResult[] = [
        {
          success: true,
          subtaskId: 'sub-1',
          commandsExecuted: 5,
          duration: 1000,
        },
      ];

      const taskResult: TaskExecutionResult = {
        success: true,
        taskId: 'task-1',
        subtasksExecuted: 1,
        duration: 1000,
      };

      const report = ReportAdapter.taskToExecutionReport('Test', taskResult, subtaskResults);

      expect(report.subtaskReports[0].output).toBe('Executed 5 command(s)');
    });

    it('should calculate start and end times correctly', () => {
      const subtaskResults: SubtaskExecutionResult[] = [];

      const taskResult: TaskExecutionResult = {
        success: true,
        taskId: 'task-1',
        subtasksExecuted: 0,
        duration: 5000,
      };

      const beforeCall = Date.now();
      const report = ReportAdapter.taskToExecutionReport('Test', taskResult, subtaskResults);
      const afterCall = Date.now();

      // Start time should be roughly 5 seconds before end time
      const actualDuration = report.endTime.getTime() - report.startTime.getTime();
      expect(actualDuration).toBeGreaterThanOrEqual(4900);
      expect(actualDuration).toBeLessThanOrEqual(5100);

      // End time should be close to now
      expect(report.endTime.getTime()).toBeGreaterThanOrEqual(beforeCall);
      expect(report.endTime.getTime()).toBeLessThanOrEqual(afterCall);
    });
  });

  describe('subtaskEntityToReport', () => {
    it('should convert completed subtask to report', () => {
      const commands = [new OxtestCommand('navigate', { url: 'https://example.com' })];
      const subtask = new Subtask('sub-1', 'Navigate to page', commands);

      // Mark as in progress then completed
      subtask.markInProgress();
      subtask.markCompleted({ success: true, output: 'Navigation successful' });

      const report = ReportAdapter.subtaskEntityToReport(subtask);

      expect(report.id).toBe('sub-1');
      expect(report.description).toBe('Navigate to page');
      expect(report.status).toBe(TaskStatus.Completed);
      expect(report.duration).toBeGreaterThanOrEqual(0);
      expect(report.timestamp).toBeInstanceOf(Date);
      expect(report.output).toBe('Navigation successful');
    });

    it('should convert failed subtask to report', () => {
      const commands = [new OxtestCommand('navigate', { url: 'https://example.com' })];
      const subtask = new Subtask('sub-1', 'Navigate to page', commands);

      subtask.markInProgress();
      subtask.markFailed(new Error('Connection timeout'));

      const report = ReportAdapter.subtaskEntityToReport(subtask);

      expect(report.status).toBe(TaskStatus.Failed);
      expect(report.error).toBe('Connection timeout');
    });

    it('should convert blocked subtask to report', () => {
      const commands = [new OxtestCommand('navigate', { url: 'https://example.com' })];
      const subtask = new Subtask('sub-1', 'Navigate to page', commands);

      subtask.markBlocked('Dependencies not met');

      const report = ReportAdapter.subtaskEntityToReport(subtask);

      expect(report.status).toBe(TaskStatus.Blocked);
      expect(report.error).toBe('Blocked: Dependencies not met');
    });

    it('should convert pending subtask to report', () => {
      const commands = [new OxtestCommand('navigate', { url: 'https://example.com' })];
      const subtask = new Subtask('sub-1', 'Navigate to page', commands);

      const report = ReportAdapter.subtaskEntityToReport(subtask);

      expect(report.status).toBe(TaskStatus.Pending);
      expect(report.duration).toBeUndefined();
      expect(report.error).toBeUndefined();
    });
  });

  describe('subtasksToExecutionReport', () => {
    it('should convert subtasks with completed state to report', () => {
      const commands = [new OxtestCommand('navigate', { url: 'https://example.com' })];

      const subtask1 = new Subtask('sub-1', 'Step 1', commands);
      subtask1.markInProgress();
      subtask1.markCompleted({ success: true, output: 'Step 1 done' });

      const subtask2 = new Subtask('sub-2', 'Step 2', commands);
      subtask2.markInProgress();
      subtask2.markCompleted({ success: true, output: 'Step 2 done' });

      const startTime = new Date('2025-11-14T10:00:00Z');
      const endTime = new Date('2025-11-14T10:00:05Z');

      const report = ReportAdapter.subtasksToExecutionReport(
        'Complete Flow',
        [subtask1, subtask2],
        startTime,
        endTime
      );

      expect(report.testName).toBe('Complete Flow');
      expect(report.startTime).toEqual(startTime);
      expect(report.endTime).toEqual(endTime);
      expect(report.duration).toBe(5000);
      expect(report.totalSubtasks).toBe(2);
      expect(report.passed).toBe(2);
      expect(report.failed).toBe(0);
      expect(report.blocked).toBe(0);
      expect(report.success).toBe(true);
    });

    it('should mark report as failed if any subtask failed', () => {
      const commands = [new OxtestCommand('navigate', { url: 'https://example.com' })];

      const subtask1 = new Subtask('sub-1', 'Step 1', commands);
      subtask1.markInProgress();
      subtask1.markCompleted({ success: true });

      const subtask2 = new Subtask('sub-2', 'Step 2', commands);
      subtask2.markInProgress();
      subtask2.markFailed(new Error('Element not found'));

      const startTime = new Date('2025-11-14T10:00:00Z');
      const endTime = new Date('2025-11-14T10:00:05Z');

      const report = ReportAdapter.subtasksToExecutionReport(
        'Failed Flow',
        [subtask1, subtask2],
        startTime,
        endTime
      );

      expect(report.passed).toBe(1);
      expect(report.failed).toBe(1);
      expect(report.success).toBe(false);
    });

    it('should mark report as failed if any subtask blocked', () => {
      const commands = [new OxtestCommand('navigate', { url: 'https://example.com' })];

      const subtask1 = new Subtask('sub-1', 'Step 1', commands);
      subtask1.markInProgress();
      subtask1.markCompleted({ success: true });

      const subtask2 = new Subtask('sub-2', 'Step 2', commands);
      subtask2.markBlocked('Blocked by previous failure');

      const startTime = new Date('2025-11-14T10:00:00Z');
      const endTime = new Date('2025-11-14T10:00:05Z');

      const report = ReportAdapter.subtasksToExecutionReport(
        'Blocked Flow',
        [subtask1, subtask2],
        startTime,
        endTime
      );

      expect(report.passed).toBe(1);
      expect(report.blocked).toBe(1);
      expect(report.success).toBe(false);
    });

    it('should handle empty subtasks array', () => {
      const startTime = new Date('2025-11-14T10:00:00Z');
      const endTime = new Date('2025-11-14T10:00:01Z');

      const report = ReportAdapter.subtasksToExecutionReport('Empty Task', [], startTime, endTime);

      expect(report.totalSubtasks).toBe(0);
      expect(report.passed).toBe(0);
      expect(report.failed).toBe(0);
      expect(report.blocked).toBe(0);
      expect(report.success).toBe(true);
      expect(report.subtaskReports).toEqual([]);
    });
  });
});
