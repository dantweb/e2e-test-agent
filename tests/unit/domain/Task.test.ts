import { Task } from '../../../src/domain/entities/Task';
import { OxtestCommand } from '../../../src/domain/entities/OxtestCommand';
import { TaskMetadata } from '../../../src/domain/interfaces/TaskMetadata';

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

    it('should include priority in string when non-zero', () => {
      const task = new Task('login-test', 'Test user login', [], undefined, undefined, {
        priority: 5,
      });
      expect(task.toString()).toContain('[priority: 5]');
    });

    it('should include tags in string when present', () => {
      const task = new Task('login-test', 'Test user login', [], undefined, undefined, {
        tags: ['auth', 'critical'],
      });
      expect(task.toString()).toContain('[tags: auth, critical]');
    });
  });

  describe('metadata', () => {
    it('should create task with default metadata when none provided', () => {
      const task = new Task('task-1', 'Description');

      expect(task.metadata).toBeDefined();
      expect(task.metadata.parallelism).toBe(1);
      expect(task.metadata.timeout).toBe(300000); // 5 minutes
      expect(task.metadata.retries).toBe(0);
      expect(task.metadata.priority).toBe(0);
      expect(task.metadata.environment).toBe('default');
    });

    it('should create task with custom metadata', () => {
      const metadata: Partial<TaskMetadata> = {
        author: 'test-user',
        tags: ['auth', 'critical'],
        parallelism: 3,
        timeout: 60000,
        retries: 2,
        priority: 5,
        environment: 'staging',
      };

      const task = new Task('task-1', 'Description', [], undefined, undefined, metadata);

      expect(task.metadata.author).toBe('test-user');
      expect(task.metadata.tags).toEqual(['auth', 'critical']);
      expect(task.metadata.parallelism).toBe(3);
      expect(task.metadata.timeout).toBe(60000);
      expect(task.metadata.retries).toBe(2);
      expect(task.metadata.priority).toBe(5);
      expect(task.metadata.environment).toBe('staging');
    });

    it('should merge partial metadata with defaults', () => {
      const task = new Task('task-1', 'Description', [], undefined, undefined, {
        priority: 10,
        tags: ['important'],
      });

      expect(task.metadata.priority).toBe(10);
      expect(task.metadata.tags).toEqual(['important']);
      expect(task.metadata.parallelism).toBe(1); // default
      expect(task.metadata.timeout).toBe(300000); // default
      expect(task.metadata.retries).toBe(0); // default
    });

    it('should reject invalid parallelism', () => {
      expect(
        () =>
          new Task('task-1', 'Description', [], undefined, undefined, {
            parallelism: 0,
          })
      ).toThrow('Parallelism must be at least 1');

      expect(
        () =>
          new Task('task-1', 'Description', [], undefined, undefined, {
            parallelism: -1,
          })
      ).toThrow('Parallelism must be at least 1');
    });

    it('should reject invalid timeout', () => {
      expect(
        () =>
          new Task('task-1', 'Description', [], undefined, undefined, {
            timeout: 0,
          })
      ).toThrow('Timeout must be positive');

      expect(
        () =>
          new Task('task-1', 'Description', [], undefined, undefined, {
            timeout: -1000,
          })
      ).toThrow('Timeout must be positive');
    });

    it('should reject invalid retries', () => {
      expect(
        () =>
          new Task('task-1', 'Description', [], undefined, undefined, {
            retries: -1,
          })
      ).toThrow('Retries cannot be negative');
    });

    it('should reject non-integer priority', () => {
      expect(
        () =>
          new Task('task-1', 'Description', [], undefined, undefined, {
            priority: 3.5,
          })
      ).toThrow('Priority must be an integer');
    });

    it('should support custom metadata fields', () => {
      const task = new Task('task-1', 'Description', [], undefined, undefined, {
        custom: {
          team: 'qa',
          jiraTicket: 'TEST-123',
          region: 'us-west',
        },
      });

      expect(task.metadata.custom).toEqual({
        team: 'qa',
        jiraTicket: 'TEST-123',
        region: 'us-west',
      });
    });

    it('should preserve metadata immutability', () => {
      const tags = ['auth', 'critical'];
      const task = new Task('task-1', 'Description', [], undefined, undefined, {
        tags,
      });

      // Modifying original array should not affect task metadata
      tags.push('modified');

      expect(task.metadata.tags).toEqual(['auth', 'critical']);
      expect(task.metadata.tags).toHaveLength(2);
    });
  });

  describe('clone with metadata', () => {
    it('should clone task with metadata', () => {
      const task = new Task('task-1', 'Description', ['sub-1'], undefined, undefined, {
        author: 'test-user',
        tags: ['auth'],
        priority: 5,
        timeout: 60000,
      });

      const clone = task.clone();

      expect(clone).not.toBe(task);
      expect(clone.metadata).toEqual(task.metadata);
      expect(clone.metadata).not.toBe(task.metadata);
      expect(clone.metadata.author).toBe('test-user');
      expect(clone.metadata.tags).toEqual(['auth']);
      expect(clone.metadata.priority).toBe(5);
      expect(clone.metadata.timeout).toBe(60000);
    });
  });
});
