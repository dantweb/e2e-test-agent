import { TestOrchestrator } from '../../../../src/application/orchestrators/TestOrchestrator';
import { PlaywrightExecutor, ExecutionResult } from '../../../../src/infrastructure/executors/PlaywrightExecutor';
import { ExecutionContextManager } from '../../../../src/application/orchestrators/ExecutionContextManager';
import { Subtask } from '../../../../src/domain/entities/Subtask';
import { Task } from '../../../../src/domain/entities/Task';
import { OxtestCommand } from '../../../../src/domain/entities/OxtestCommand';
import { SelectorSpec } from '../../../../src/domain/entities/SelectorSpec';

describe('TestOrchestrator', () => {
  let orchestrator: TestOrchestrator;
  let mockExecutor: jest.Mocked<PlaywrightExecutor>;
  let contextManager: ExecutionContextManager;

  beforeEach(() => {
    // Create mock executor
    mockExecutor = {
      execute: jest.fn(),
      initialize: jest.fn(),
      close: jest.fn(),
      getPage: jest.fn(),
    } as any;

    contextManager = new ExecutionContextManager();

    orchestrator = new TestOrchestrator(mockExecutor, contextManager);
  });

  describe('executeSubtask', () => {
    it('should execute single command successfully', async () => {
      const mockResult: ExecutionResult = {
        success: true,
        duration: 100,
      };
      mockExecutor.execute.mockResolvedValue(mockResult);

      const subtask = new Subtask('sub-1', 'Navigate to homepage', [
        new OxtestCommand('navigate', { url: 'https://shop.dev' }),
      ]);

      const result = await orchestrator.executeSubtask(subtask);

      expect(result.success).toBe(true);
      expect(result.subtaskId).toBe('sub-1');
      expect(result.commandsExecuted).toBe(1);
      expect(mockExecutor.execute).toHaveBeenCalledTimes(1);
    });

    it('should execute multiple commands in sequence', async () => {
      mockExecutor.execute.mockResolvedValue({ success: true, duration: 100 });

      const commands = [
        new OxtestCommand('navigate', { url: 'https://shop.dev' }),
        new OxtestCommand('click', {}, new SelectorSpec('css', 'button.login')),
        new OxtestCommand('wait', { timeout: 1000 }),
      ];

      const subtask = new Subtask('sub-1', 'Login flow', commands);

      const result = await orchestrator.executeSubtask(subtask);

      expect(result.success).toBe(true);
      expect(result.commandsExecuted).toBe(3);
      expect(mockExecutor.execute).toHaveBeenCalledTimes(3);
      expect(mockExecutor.execute).toHaveBeenNthCalledWith(1, commands[0]);
      expect(mockExecutor.execute).toHaveBeenNthCalledWith(2, commands[1]);
      expect(mockExecutor.execute).toHaveBeenNthCalledWith(3, commands[2]);
    });

    it('should fail subtask when command fails', async () => {
      const mockResult: ExecutionResult = {
        success: false,
        error: 'Element not found',
        duration: 100,
      };
      mockExecutor.execute.mockResolvedValue(mockResult);

      const subtask = new Subtask('sub-1', 'Click missing button', [
        new OxtestCommand('click', {}, new SelectorSpec('css', '.missing')),
      ]);

      const result = await orchestrator.executeSubtask(subtask);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Element not found');
      expect(result.commandsExecuted).toBe(1);
    });

    it('should stop execution after first failed command', async () => {
      mockExecutor.execute
        .mockResolvedValueOnce({ success: true, duration: 100 })
        .mockResolvedValueOnce({ success: false, error: 'Click failed', duration: 100 });

      const commands = [
        new OxtestCommand('navigate', { url: 'https://shop.dev' }),
        new OxtestCommand('click', {}, new SelectorSpec('css', '.fail')),
        new OxtestCommand('wait', { timeout: 1000 }),
      ];

      const subtask = new Subtask('sub-1', 'Test', commands);

      const result = await orchestrator.executeSubtask(subtask);

      expect(result.success).toBe(false);
      expect(result.commandsExecuted).toBe(2);
      expect(mockExecutor.execute).toHaveBeenCalledTimes(2);
    });

    it('should handle executor exceptions', async () => {
      mockExecutor.execute.mockRejectedValue(new Error('Browser crashed'));

      const subtask = new Subtask('sub-1', 'Test', [
        new OxtestCommand('navigate', { url: 'https://shop.dev' }),
      ]);

      const result = await orchestrator.executeSubtask(subtask);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Browser crashed');
    });

    it('should track execution duration', async () => {
      mockExecutor.execute.mockResolvedValue({ success: true, duration: 150 });

      const subtask = new Subtask('sub-1', 'Test', [
        new OxtestCommand('wait', { timeout: 100 }),
      ]);

      const result = await orchestrator.executeSubtask(subtask);

      expect(result.success).toBe(true);
      expect(result.duration).toBeGreaterThanOrEqual(0);
    });
  });

  describe('executeTask', () => {
    it('should execute task with single subtask', async () => {
      mockExecutor.execute.mockResolvedValue({ success: true, duration: 100 });

      const subtask = new Subtask('sub-1', 'Navigate', [
        new OxtestCommand('navigate', { url: 'https://shop.dev' }),
      ]);

      const task = new Task('task-1', 'Test task', ['sub-1']);

      const result = await orchestrator.executeTask(task, [subtask]);

      expect(result.success).toBe(true);
      expect(result.taskId).toBe('task-1');
      expect(result.subtasksExecuted).toBe(1);
    });

    it('should execute task with multiple subtasks in sequence', async () => {
      mockExecutor.execute.mockResolvedValue({ success: true, duration: 100 });

      const subtask1 = new Subtask('sub-1', 'Navigate', [
        new OxtestCommand('navigate', { url: 'https://shop.dev' }),
      ]);

      const subtask2 = new Subtask('sub-2', 'Click', [
        new OxtestCommand('click', {}, new SelectorSpec('css', 'button')),
      ]);

      const task = new Task('task-1', 'Test task', ['sub-1', 'sub-2']);

      const result = await orchestrator.executeTask(task, [subtask1, subtask2]);

      expect(result.success).toBe(true);
      expect(result.subtasksExecuted).toBe(2);
      expect(mockExecutor.execute).toHaveBeenCalledTimes(2);
    });

    it('should fail task when subtask fails', async () => {
      mockExecutor.execute
        .mockResolvedValueOnce({ success: true, duration: 100 })
        .mockResolvedValueOnce({ success: false, error: 'Failed', duration: 100 });

      const subtask1 = new Subtask('sub-1', 'Navigate', [
        new OxtestCommand('navigate', { url: 'https://shop.dev' }),
      ]);

      const subtask2 = new Subtask('sub-2', 'Click', [
        new OxtestCommand('click', {}, new SelectorSpec('css', 'button')),
      ]);

      const task = new Task('task-1', 'Test task', ['sub-1', 'sub-2']);

      const result = await orchestrator.executeTask(task, [subtask1, subtask2]);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed');
      expect(result.subtasksExecuted).toBe(2);
    });

    it('should execute setup commands before subtasks', async () => {
      mockExecutor.execute.mockResolvedValue({ success: true, duration: 100 });

      const setupCommands = [
        new OxtestCommand('navigate', { url: 'https://shop.dev' }),
        new OxtestCommand('wait', { timeout: 500 }),
      ];

      const subtask = new Subtask('sub-1', 'Main action', [
        new OxtestCommand('click', {}, new SelectorSpec('css', 'button')),
      ]);

      const task = new Task('task-1', 'Test task', ['sub-1'], setupCommands);

      const result = await orchestrator.executeTask(task, [subtask]);

      expect(result.success).toBe(true);
      expect(mockExecutor.execute).toHaveBeenCalledTimes(3); // 2 setup + 1 subtask command
    });

    it('should execute teardown commands after subtasks', async () => {
      mockExecutor.execute.mockResolvedValue({ success: true, duration: 100 });

      const teardownCommands = [
        new OxtestCommand('screenshot', { path: '/tmp/test.png' }),
        new OxtestCommand('wait', { timeout: 100 }),
      ];

      const subtask = new Subtask('sub-1', 'Main action', [
        new OxtestCommand('click', {}, new SelectorSpec('css', 'button')),
      ]);

      const task = new Task('task-1', 'Test task', ['sub-1'], undefined, teardownCommands);

      const result = await orchestrator.executeTask(task, [subtask]);

      expect(result.success).toBe(true);
      expect(mockExecutor.execute).toHaveBeenCalledTimes(3); // 1 subtask + 2 teardown commands
    });

    it('should execute teardown even if subtask fails', async () => {
      mockExecutor.execute
        .mockResolvedValueOnce({ success: false, error: 'Failed', duration: 100 })
        .mockResolvedValueOnce({ success: true, duration: 100 });

      const teardownCommands = [
        new OxtestCommand('screenshot', { path: '/tmp/error.png' }),
      ];

      const subtask = new Subtask('sub-1', 'Main action', [
        new OxtestCommand('click', {}, new SelectorSpec('css', 'button')),
      ]);

      const task = new Task('task-1', 'Test task', ['sub-1'], undefined, teardownCommands);

      const result = await orchestrator.executeTask(task, [subtask]);

      expect(result.success).toBe(false);
      expect(mockExecutor.execute).toHaveBeenCalledTimes(2); // 1 failed subtask + 1 teardown
    });

    it('should handle missing subtask IDs', async () => {
      mockExecutor.execute.mockResolvedValue({ success: true, duration: 100 });

      const subtask = new Subtask('sub-1', 'Action', [
        new OxtestCommand('wait', { timeout: 100 }),
      ]);

      const task = new Task('task-1', 'Test task', ['sub-1', 'sub-missing']);

      const result = await orchestrator.executeTask(task, [subtask]);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Subtask not found: sub-missing');
    });

    it('should track total task duration', async () => {
      mockExecutor.execute.mockResolvedValue({ success: true, duration: 100 });

      const subtask = new Subtask('sub-1', 'Test', [
        new OxtestCommand('wait', { timeout: 100 }),
      ]);

      const task = new Task('task-1', 'Test task', ['sub-1']);

      const result = await orchestrator.executeTask(task, [subtask]);

      expect(result.success).toBe(true);
      expect(result.duration).toBeGreaterThanOrEqual(0);
    });
  });

  describe('execution context', () => {
    it('should maintain context across subtasks', async () => {
      mockExecutor.execute.mockResolvedValue({ success: true, duration: 100 });

      contextManager.setVariable('user', 'admin');

      const subtask = new Subtask('sub-1', 'Test', [
        new OxtestCommand('wait', { timeout: 100 }),
      ]);

      const task = new Task('task-1', 'Test task', ['sub-1']);

      await orchestrator.executeTask(task, [subtask]);

      const context = orchestrator.getContext();
      expect(context.variables['user']).toBe('admin');
    });

    it('should update context with navigation URL', async () => {
      mockExecutor.execute.mockResolvedValue({ success: true, duration: 100 });

      const subtask = new Subtask('sub-1', 'Navigate', [
        new OxtestCommand('navigate', { url: 'https://shop.dev' }),
      ]);

      const task = new Task('task-1', 'Test task', ['sub-1']);

      await orchestrator.executeTask(task, [subtask]);

      const context = orchestrator.getContext();
      expect(context.variables['lastUrl']).toBe('https://shop.dev');
    });
  });
});
