import { TaskDecomposer } from '../../../../src/application/engines/TaskDecomposer';
import { IterativeDecompositionEngine } from '../../../../src/application/engines/IterativeDecompositionEngine';
import { Task } from '../../../../src/domain/entities/Task';
import { Subtask } from '../../../../src/domain/entities/Subtask';
import { OxtestCommand } from '../../../../src/domain/entities/OxtestCommand';

describe('TaskDecomposer', () => {
  let mockDecompositionEngine: jest.Mocked<IterativeDecompositionEngine>;
  let decomposer: TaskDecomposer;

  beforeEach(() => {
    mockDecompositionEngine = {
      decompose: jest.fn(),
    } as any;

    decomposer = new TaskDecomposer(mockDecompositionEngine);
  });

  describe('decomposeTask', () => {
    it('should decompose a task with single step', async () => {
      const task = new Task('task-1', 'Login to the application', []);

      const expectedSubtask = new Subtask('task-1-step-1', 'Login to the application', [
        new OxtestCommand('navigate', { url: 'https://example.com/login' }),
        new OxtestCommand('wait', { duration: 1000 }),
      ]);

      mockDecompositionEngine.decompose.mockResolvedValue(expectedSubtask);

      const result = await decomposer.decomposeTask(task);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(expectedSubtask);
      expect(mockDecompositionEngine.decompose).toHaveBeenCalledWith('Login to the application');
    });

    it('should handle task with setup commands', async () => {
      const setupCommands = [new OxtestCommand('navigate', { url: 'https://example.com' })];

      const task = new Task('task-1', 'Test user flow', [], setupCommands, undefined);

      const expectedSubtask = new Subtask('task-1-step-1', 'Test user flow', [
        new OxtestCommand('wait', { duration: 100 }),
      ]);

      mockDecompositionEngine.decompose.mockResolvedValue(expectedSubtask);

      const result = await decomposer.decomposeTask(task);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(expectedSubtask);
    });

    it('should handle task with teardown commands', async () => {
      const teardownCommands = [
        new OxtestCommand('navigate', { url: 'https://example.com/logout' }),
      ];

      const task = new Task('task-1', 'Test and logout', [], undefined, teardownCommands);

      const expectedSubtask = new Subtask('task-1-step-1', 'Test and logout', [
        new OxtestCommand('wait', { duration: 100 }),
      ]);

      mockDecompositionEngine.decompose.mockResolvedValue(expectedSubtask);

      const result = await decomposer.decomposeTask(task);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(expectedSubtask);
    });

    it('should handle empty task description', async () => {
      const task = new Task('task-1', 'Do nothing', []);

      const expectedSubtask = new Subtask('task-1-step-1', 'Do nothing', [
        new OxtestCommand('wait', { duration: 0 }),
      ]);

      mockDecompositionEngine.decompose.mockResolvedValue(expectedSubtask);

      const result = await decomposer.decomposeTask(task);

      expect(result).toHaveLength(1);
      expect(mockDecompositionEngine.decompose).toHaveBeenCalledWith('Do nothing');
    });

    it('should propagate errors from decomposition engine', async () => {
      const task = new Task('task-1', 'Failing task', []);

      mockDecompositionEngine.decompose.mockRejectedValue(new Error('Decomposition failed'));

      await expect(decomposer.decomposeTask(task)).rejects.toThrow('Decomposition failed');
    });
  });

  describe('decomposeTaskWithSteps', () => {
    it('should decompose task into multiple steps', async () => {
      const task = new Task('task-1', 'Complete checkout flow', []);

      const steps = [
        'Add item to cart',
        'Go to checkout',
        'Enter payment info',
        'Complete purchase',
      ];

      const subtasks = steps.map(
        (step, idx) =>
          new Subtask(`task-1-step-${idx + 1}`, step, [
            new OxtestCommand('wait', { duration: 100 }),
          ])
      );

      mockDecompositionEngine.decompose.mockResolvedValueOnce(subtasks[0]);
      mockDecompositionEngine.decompose.mockResolvedValueOnce(subtasks[1]);
      mockDecompositionEngine.decompose.mockResolvedValueOnce(subtasks[2]);
      mockDecompositionEngine.decompose.mockResolvedValueOnce(subtasks[3]);

      const result = await decomposer.decomposeTaskWithSteps(task, steps);

      expect(result).toHaveLength(4);
      expect(result).toEqual(subtasks);
      expect(mockDecompositionEngine.decompose).toHaveBeenCalledTimes(4);
    });

    it('should handle empty steps array', async () => {
      const task = new Task('task-1', 'Empty task', []);
      const steps: string[] = [];

      const result = await decomposer.decomposeTaskWithSteps(task, steps);

      expect(result).toHaveLength(0);
      expect(mockDecompositionEngine.decompose).not.toHaveBeenCalled();
    });

    it('should continue on partial failure when continueOnError is true', async () => {
      const task = new Task('task-1', 'Multi-step task', []);
      const steps = ['Step 1', 'Step 2', 'Step 3'];

      const subtask1 = new Subtask('task-1-step-1', 'Step 1', [
        new OxtestCommand('wait', { duration: 100 }),
      ]);
      const subtask3 = new Subtask('task-1-step-3', 'Step 3', [
        new OxtestCommand('wait', { duration: 100 }),
      ]);

      mockDecompositionEngine.decompose.mockResolvedValueOnce(subtask1);
      mockDecompositionEngine.decompose.mockRejectedValueOnce(new Error('Step 2 failed'));
      mockDecompositionEngine.decompose.mockResolvedValueOnce(subtask3);

      const result = await decomposer.decomposeTaskWithSteps(task, steps, true);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual(subtask1);
      expect(result[1]).toEqual(subtask3);
    });

    it('should fail immediately when continueOnError is false', async () => {
      const task = new Task('task-1', 'Multi-step task', []);
      const steps = ['Step 1', 'Step 2', 'Step 3'];

      const subtask1 = new Subtask('task-1-step-1', 'Step 1', [
        new OxtestCommand('wait', { duration: 100 }),
      ]);

      mockDecompositionEngine.decompose.mockResolvedValueOnce(subtask1);
      mockDecompositionEngine.decompose.mockRejectedValueOnce(new Error('Step 2 failed'));

      await expect(decomposer.decomposeTaskWithSteps(task, steps, false)).rejects.toThrow(
        'Step 2 failed'
      );
    });
  });

  describe('decomposeIntoValidationSubtask', () => {
    it('should create validation subtask from predicates', () => {
      const task = new Task('task-1', 'Test validation', []);
      const predicates = {
        url_contains: '/dashboard',
        element_exists: '.user-menu',
        element_not_exists: '.error',
      };

      const result = decomposer.decomposeIntoValidationSubtask(task, predicates);

      expect(result.id).toBe('task-1-validation');
      expect(result.description).toBe('Validation for: Test validation');
      expect(result.commands).toHaveLength(3);
      expect(result.commands[0].type).toBe('assertUrl');
      expect(result.commands[1].type).toBe('assertVisible');
      expect(result.commands[2].type).toBe('assertHidden');
    });

    it('should handle empty predicates', () => {
      const task = new Task('task-1', 'Test validation', []);
      const predicates = {};

      const result = decomposer.decomposeIntoValidationSubtask(task, predicates);

      expect(result.id).toBe('task-1-validation');
      expect(result.commands).toHaveLength(1);
      expect(result.commands[0].type).toBe('wait');
    });

    it('should handle url_contains predicate', () => {
      const task = new Task('task-1', 'Check URL', []);
      const predicates = { url_contains: '/success' };

      const result = decomposer.decomposeIntoValidationSubtask(task, predicates);

      expect(result.commands).toHaveLength(1);
      expect(result.commands[0].type).toBe('assertUrl');
      expect(result.commands[0].params?.expected).toBe('/success');
    });

    it('should handle element_exists predicate', () => {
      const task = new Task('task-1', 'Check element', []);
      const predicates = { element_exists: '.success-message' };

      const result = decomposer.decomposeIntoValidationSubtask(task, predicates);

      expect(result.commands).toHaveLength(1);
      expect(result.commands[0].type).toBe('assertVisible');
      expect(result.commands[0].selector?.value).toBe('.success-message');
    });

    it('should handle multiple predicates', () => {
      const task = new Task('task-1', 'Multiple checks', []);
      const predicates = {
        url_contains: '/dashboard',
        element_exists: '.user-menu',
        element_not_exists: '.error',
        element_visible: '.welcome',
        text_contains: 'Welcome',
      };

      const result = decomposer.decomposeIntoValidationSubtask(task, predicates);

      expect(result.commands).toHaveLength(5);
    });
  });
});
