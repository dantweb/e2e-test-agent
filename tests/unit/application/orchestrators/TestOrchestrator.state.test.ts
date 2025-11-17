/**
 * TestOrchestrator with State Machine Integration Tests
 *
 * Sprint 7: Test state machine integration for subtask execution tracking
 *
 * These tests verify that TestOrchestrator properly:
 * 1. Transitions subtask states during execution (Pending → InProgress → Completed/Failed)
 * 2. Captures ExecutionResult with timing and metadata
 * 3. Handles state transition errors gracefully
 * 4. Updates subtask entities with execution results
 */

import { TestOrchestrator } from '../../../../src/application/orchestrators/TestOrchestrator';
import { PlaywrightExecutor } from '../../../../src/infrastructure/executors/PlaywrightExecutor';
import { ExecutionContextManager } from '../../../../src/application/orchestrators/ExecutionContextManager';
import { Task } from '../../../../src/domain/entities/Task';
import { Subtask } from '../../../../src/domain/entities/Subtask';
import { OxtestCommand } from '../../../../src/domain/entities/OxtestCommand';
import { SelectorSpec } from '../../../../src/domain/entities/SelectorSpec';
import { TaskStatus } from '../../../../src/domain/enums/TaskStatus';

describe('TestOrchestrator - State Machine Integration (Sprint 7)', () => {
  let mockExecutor: jest.Mocked<PlaywrightExecutor>;
  let mockContextManager: jest.Mocked<ExecutionContextManager>;
  let orchestrator: TestOrchestrator;

  beforeEach(() => {
    mockExecutor = {
      execute: jest.fn(),
    } as any;

    mockContextManager = {
      setVariable: jest.fn(),
      getContext: jest.fn().mockReturnValue({}),
    } as any;

    orchestrator = new TestOrchestrator(mockExecutor, mockContextManager);
  });

  describe('executeSubtaskWithStateTracking', () => {
    it('should transition subtask from Pending to InProgress to Completed', async () => {
      const subtask = new Subtask('sub-1', 'Navigate and click', [
        new OxtestCommand('navigate', { url: 'https://example.com' }),
        new OxtestCommand('click', {}, new SelectorSpec('css', '#button')),
      ]);

      // Verify initial state
      expect(subtask.status).toBe(TaskStatus.Pending);
      expect(subtask.isPending()).toBe(true);

      // Mock successful execution
      mockExecutor.execute
        .mockResolvedValueOnce({ success: true, duration: 10 })
        .mockResolvedValueOnce({ success: true, duration: 15 });

      const result = await orchestrator.executeSubtaskWithStateTracking(subtask);

      // Verify final state
      expect(result.success).toBe(true);
      expect(subtask.status).toBe(TaskStatus.Completed);
      expect(subtask.isCompleted()).toBe(true);
      expect(subtask.result).toBeDefined();
      expect(subtask.result?.success).toBe(true);
      expect(subtask.result?.duration).toBeGreaterThanOrEqual(0);
      expect(subtask.result?.timestamp).toBeInstanceOf(Date);
    });

    it('should transition subtask to Failed on command error', async () => {
      const subtask = new Subtask('sub-1', 'Failing command', [
        new OxtestCommand('navigate', { url: 'https://example.com' }),
        new OxtestCommand('click', {}, new SelectorSpec('css', '#nonexistent')),
      ]);

      // First command succeeds, second fails
      mockExecutor.execute
        .mockResolvedValueOnce({ success: true, duration: 10 })
        .mockResolvedValueOnce({ success: false, error: 'Element not found', duration: 5 });

      const result = await orchestrator.executeSubtaskWithStateTracking(subtask);

      // Verify failure state
      expect(result.success).toBe(false);
      expect(subtask.status).toBe(TaskStatus.Failed);
      expect(subtask.isFailed()).toBe(true);
      expect(subtask.result).toBeDefined();
      expect(subtask.result?.success).toBe(false);
      expect(subtask.result?.error).toBeDefined();
      expect(subtask.result?.error?.message).toContain('Element not found');
    });

    it('should transition subtask to Failed on exception', async () => {
      const subtask = new Subtask('sub-1', 'Exception during execution', [
        new OxtestCommand('navigate', { url: 'https://example.com' }),
      ]);

      mockExecutor.execute.mockRejectedValue(new Error('Network timeout'));

      const result = await orchestrator.executeSubtaskWithStateTracking(subtask);

      expect(result.success).toBe(false);
      expect(subtask.status).toBe(TaskStatus.Failed);
      expect(subtask.result?.error?.message).toContain('Network timeout');
    });

    it('should capture execution duration in result', async () => {
      const subtask = new Subtask('sub-1', 'Timed execution', [
        new OxtestCommand('wait', { duration: 100 }),
      ]);

      mockExecutor.execute.mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
        return { success: true, duration: 50 };
      });

      const result = await orchestrator.executeSubtaskWithStateTracking(subtask);

      expect(result.success).toBe(true);
      expect(subtask.result?.duration).toBeGreaterThanOrEqual(0); // Allow for fast execution
      expect(subtask.result?.duration).toBeLessThan(1000);
    });

    it('should prevent invalid state transitions', async () => {
      const subtask = new Subtask('sub-1', 'Test task', [
        new OxtestCommand('navigate', { url: 'https://example.com' }),
      ]);

      // Manually set to invalid state
      subtask.status = TaskStatus.Completed;

      mockExecutor.execute.mockResolvedValue({ success: true, duration: 10 });

      // Should throw error when trying to transition from Completed to InProgress
      await expect(orchestrator.executeSubtaskWithStateTracking(subtask)).rejects.toThrow(
        /Invalid state transition/
      );
    });

    it('should include command count in execution result', async () => {
      const subtask = new Subtask('sub-1', 'Multiple commands', [
        new OxtestCommand('navigate', { url: 'https://example.com' }),
        new OxtestCommand('click', {}, new SelectorSpec('css', '#btn1')),
        new OxtestCommand('click', {}, new SelectorSpec('css', '#btn2')),
        new OxtestCommand('wait', { duration: 100 }),
      ]);

      mockExecutor.execute.mockResolvedValue({ success: true, duration: 10 });

      const result = await orchestrator.executeSubtaskWithStateTracking(subtask);

      expect(result.success).toBe(true);
      expect(result.commandsExecuted).toBe(4);
      expect(subtask.result?.metadata?.commandsExecuted).toBe(4);
    });
  });

  describe('executeTaskWithStateTracking', () => {
    it('should track state for all subtasks in a task', async () => {
      const subtask1 = new Subtask('sub-1', 'Step 1', [
        new OxtestCommand('navigate', { url: 'https://example.com' }),
      ]);
      const subtask2 = new Subtask('sub-2', 'Step 2', [
        new OxtestCommand('click', {}, new SelectorSpec('css', '#button')),
      ]);

      const task = new Task('task-1', 'Two-step task', ['sub-1', 'sub-2']);

      mockExecutor.execute.mockResolvedValue({ success: true, duration: 10 });

      const result = await orchestrator.executeTaskWithStateTracking(task, [subtask1, subtask2]);

      expect(result.success).toBe(true);
      expect(subtask1.status).toBe(TaskStatus.Completed);
      expect(subtask2.status).toBe(TaskStatus.Completed);
      expect(subtask1.result).toBeDefined();
      expect(subtask2.result).toBeDefined();
    });

    it('should mark remaining subtasks as Blocked on failure', async () => {
      const subtask1 = new Subtask('sub-1', 'Step 1', [
        new OxtestCommand('navigate', { url: 'https://example.com' }),
      ]);
      const subtask2 = new Subtask('sub-2', 'Step 2 (will be blocked)', [
        new OxtestCommand('click', {}, new SelectorSpec('css', '#button')),
      ]);

      const task = new Task('task-1', 'Task with failure', ['sub-1', 'sub-2']);

      // First subtask fails
      mockExecutor.execute.mockResolvedValueOnce({ success: false, error: 'Failed', duration: 5 });

      const result = await orchestrator.executeTaskWithStateTracking(task, [subtask1, subtask2]);

      expect(result.success).toBe(false);
      expect(subtask1.status).toBe(TaskStatus.Failed);
      expect(subtask2.status).toBe(TaskStatus.Blocked);
      expect(subtask2.isBlocked()).toBe(true);
      expect(subtask2.result?.error?.message).toContain('Blocked');
    });

    it('should handle setup and teardown with state tracking', async () => {
      const setupCmd = new OxtestCommand('navigate', { url: 'https://example.com/setup' });
      const teardownCmd = new OxtestCommand('navigate', { url: 'https://example.com/cleanup' });

      const subtask = new Subtask('sub-1', 'Main task', [
        new OxtestCommand('click', {}, new SelectorSpec('css', '#button')),
      ]);

      const task = new Task(
        'task-1',
        'Task with setup/teardown',
        ['sub-1'],
        [setupCmd],
        [teardownCmd]
      );

      mockExecutor.execute.mockResolvedValue({ success: true, duration: 10 });

      const result = await orchestrator.executeTaskWithStateTracking(task, [subtask]);

      expect(result.success).toBe(true);
      expect(mockExecutor.execute).toHaveBeenCalledTimes(3); // setup + main + teardown
      expect(subtask.status).toBe(TaskStatus.Completed);
    });

    it('should execute teardown even if subtask fails', async () => {
      const teardownCmd = new OxtestCommand('navigate', { url: 'https://example.com/cleanup' });

      const subtask = new Subtask('sub-1', 'Failing task', [
        new OxtestCommand('click', {}, new SelectorSpec('css', '#nonexistent')),
      ]);

      const task = new Task('task-1', 'Task with failure', ['sub-1'], undefined, [teardownCmd]);

      mockExecutor.execute
        .mockResolvedValueOnce({ success: false, error: 'Element not found', duration: 5 })
        .mockResolvedValueOnce({ success: true, duration: 10 });

      const result = await orchestrator.executeTaskWithStateTracking(task, [subtask]);

      expect(result.success).toBe(false);
      expect(subtask.status).toBe(TaskStatus.Failed);
      expect(mockExecutor.execute).toHaveBeenCalledTimes(2); // failed command + teardown
    });
  });

  describe('State Query Methods', () => {
    it('should allow querying subtask state during execution', async () => {
      const subtask = new Subtask('sub-1', 'Test task', [
        new OxtestCommand('navigate', { url: 'https://example.com' }),
      ]);

      expect(subtask.isPending()).toBe(true);
      expect(subtask.isInProgress()).toBe(false);
      expect(subtask.isCompleted()).toBe(false);
      expect(subtask.isFailed()).toBe(false);
      expect(subtask.isTerminal()).toBe(false);

      mockExecutor.execute.mockResolvedValue({ success: true, duration: 10 });

      await orchestrator.executeSubtaskWithStateTracking(subtask);

      expect(subtask.isPending()).toBe(false);
      expect(subtask.isCompleted()).toBe(true);
      expect(subtask.isTerminal()).toBe(true);
    });

    it('should correctly identify failed terminal state', async () => {
      const subtask = new Subtask('sub-1', 'Failing task', [
        new OxtestCommand('click', {}, new SelectorSpec('css', '#nonexistent')),
      ]);

      mockExecutor.execute.mockResolvedValue({ success: false, error: 'Not found', duration: 5 });

      await orchestrator.executeSubtaskWithStateTracking(subtask);

      expect(subtask.isFailed()).toBe(true);
      expect(subtask.isTerminal()).toBe(true);
      expect(subtask.isCompleted()).toBe(false);
    });
  });

  describe('Execution Result Metadata', () => {
    it('should capture detailed execution metadata', async () => {
      const subtask = new Subtask('sub-1', 'Detailed execution', [
        new OxtestCommand('navigate', { url: 'https://example.com' }),
        new OxtestCommand('click', {}, new SelectorSpec('css', '#button')),
      ]);

      mockExecutor.execute.mockResolvedValue({ success: true, duration: 10 });

      await orchestrator.executeSubtaskWithStateTracking(subtask);

      expect(subtask.result).toMatchObject({
        success: true,
        duration: expect.any(Number),
        timestamp: expect.any(Date),
        metadata: expect.objectContaining({
          commandsExecuted: 2,
          subtaskId: 'sub-1',
        }),
      });
    });

    it('should capture error details in failed execution result', async () => {
      const subtask = new Subtask('sub-1', 'Error capture test', [
        new OxtestCommand('click', {}, new SelectorSpec('css', '#missing')),
      ]);

      const errorDetails = {
        success: false,
        error: 'Element not found: #missing',
        duration: 5,
      };

      mockExecutor.execute.mockResolvedValue(errorDetails);

      await orchestrator.executeSubtaskWithStateTracking(subtask);

      expect(subtask.result?.error?.message).toBe('Element not found: #missing');
    });
  });
});
