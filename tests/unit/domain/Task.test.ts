import { Task } from '../../../src/domain/entities/Task';
import { OxtestCommand } from '../../../src/domain/entities/OxtestCommand';

describe('Task', () => {
  describe('constructor', () => {
    it('should create a Task with required fields', () => {
      const task = new Task('login-test', 'Test user login');

      expect(task.id).toBe('login-test');
      expect(task.description).toBe('Test user login');
      expect(task.subtasks).toEqual([]);
      expect(task.setup).toBeUndefined();
      expect(task.teardown).toBeUndefined();
    });

    it('should create a Task with subtasks', () => {
      const task = new Task('login-test', 'Test user login', ['subtask-1', 'subtask-2']);

      expect(task.subtasks).toHaveLength(2);
      expect(task.subtasks).toContain('subtask-1');
      expect(task.subtasks).toContain('subtask-2');
    });

    it('should create a Task with setup commands', () => {
      const setupCmd = new OxtestCommand('navigate', { url: 'https://example.com' });
      const task = new Task('login-test', 'Test user login', [], [setupCmd]);

      expect(task.setup).toHaveLength(1);
      expect(task.setup?.[0].type).toBe('navigate');
    });

    it('should create a Task with teardown commands', () => {
      const teardownCmd = new OxtestCommand('screenshot', { name: 'final' });
      const task = new Task('login-test', 'Test user login', [], undefined, [teardownCmd]);

      expect(task.teardown).toHaveLength(1);
      expect(task.teardown?.[0].type).toBe('screenshot');
    });
  });

  describe('validation', () => {
    it('should reject empty id', () => {
      expect(() => new Task('', 'Description')).toThrow('Task id cannot be empty');
    });

    it('should reject empty description', () => {
      expect(() => new Task('task-1', '')).toThrow('Task description cannot be empty');
    });

    it('should reject duplicate subtask IDs', () => {
      expect(() => new Task('task-1', 'Description', ['sub-1', 'sub-1'])).toThrow(
        'Duplicate subtask IDs are not allowed'
      );
    });
  });

  describe('hasSubtasks', () => {
    it('should return true when task has subtasks', () => {
      const task = new Task('task-1', 'Description', ['sub-1', 'sub-2']);
      expect(task.hasSubtasks()).toBe(true);
    });

    it('should return false when task has no subtasks', () => {
      const task = new Task('task-1', 'Description');
      expect(task.hasSubtasks()).toBe(false);
    });
  });

  describe('hasSetup', () => {
    it('should return true when task has setup commands', () => {
      const setupCmd = new OxtestCommand('navigate', { url: 'https://example.com' });
      const task = new Task('task-1', 'Description', [], [setupCmd]);
      expect(task.hasSetup()).toBe(true);
    });

    it('should return false when task has no setup commands', () => {
      const task = new Task('task-1', 'Description');
      expect(task.hasSetup()).toBe(false);
    });
  });

  describe('hasTeardown', () => {
    it('should return true when task has teardown commands', () => {
      const teardownCmd = new OxtestCommand('screenshot', { name: 'end' });
      const task = new Task('task-1', 'Description', [], undefined, [teardownCmd]);
      expect(task.hasTeardown()).toBe(true);
    });

    it('should return false when task has no teardown commands', () => {
      const task = new Task('task-1', 'Description');
      expect(task.hasTeardown()).toBe(false);
    });
  });

  describe('clone', () => {
    it('should create a deep copy of the task', () => {
      const setupCmd = new OxtestCommand('navigate', { url: 'https://example.com' });
      const task = new Task('task-1', 'Description', ['sub-1'], [setupCmd]);
      const clone = task.clone();

      expect(clone).not.toBe(task);
      expect(clone.id).toBe(task.id);
      expect(clone.description).toBe(task.description);
      expect(clone.subtasks).toEqual(task.subtasks);
      expect(clone.subtasks).not.toBe(task.subtasks);
      expect(clone.setup).toBeDefined();
      expect(clone.setup).not.toBe(task.setup);
    });
  });

  describe('toString', () => {
    it('should return string representation of task', () => {
      const task = new Task('login-test', 'Test user login');
      expect(task.toString()).toBe('Task[login-test]: Test user login');
    });

    it('should include subtask count in string', () => {
      const task = new Task('login-test', 'Test user login', ['sub-1', 'sub-2']);
      expect(task.toString()).toContain('2 subtasks');
    });
  });
});
