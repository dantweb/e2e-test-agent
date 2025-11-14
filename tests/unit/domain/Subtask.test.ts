import { Subtask } from '../../../src/domain/entities/Subtask';
import { OxtestCommand } from '../../../src/domain/entities/OxtestCommand';
import { SelectorSpec } from '../../../src/domain/entities/SelectorSpec';
import { TaskStatus } from '../../../src/domain/enums/TaskStatus';

describe('Subtask', () => {
  describe('constructor', () => {
    it('should create a Subtask with required fields', () => {
      const clickCmd = new OxtestCommand('click', {}, new SelectorSpec('css', '.button'));
      const subtask = new Subtask('sub-1', 'Click the button', [clickCmd]);

      expect(subtask.id).toBe('sub-1');
      expect(subtask.description).toBe('Click the button');
      expect(subtask.commands).toHaveLength(1);
      expect(subtask.commands[0].type).toBe('click');
    });

    it('should create a Subtask with multiple commands', () => {
      const navCmd = new OxtestCommand('navigate', { url: 'https://example.com' });
      const clickCmd = new OxtestCommand('click', {}, new SelectorSpec('css', '.button'));
      const subtask = new Subtask('sub-1', 'Navigate and click', [navCmd, clickCmd]);

      expect(subtask.commands).toHaveLength(2);
      expect(subtask.commands[0].type).toBe('navigate');
      expect(subtask.commands[1].type).toBe('click');
    });
  });

  describe('validation', () => {
    it('should reject empty id', () => {
      const cmd = new OxtestCommand('navigate', { url: 'https://example.com' });
      expect(() => new Subtask('', 'Description', [cmd])).toThrow('Subtask id cannot be empty');
    });

    it('should reject empty description', () => {
      const cmd = new OxtestCommand('navigate', { url: 'https://example.com' });
      expect(() => new Subtask('sub-1', '', [cmd])).toThrow('Subtask description cannot be empty');
    });

    it('should reject empty commands array', () => {
      expect(() => new Subtask('sub-1', 'Description', [])).toThrow(
        'Subtask must have at least one command'
      );
    });
  });

  describe('getCommandCount', () => {
    it('should return the number of commands', () => {
      const cmd1 = new OxtestCommand('navigate', { url: 'https://example.com' });
      const cmd2 = new OxtestCommand('click', {}, new SelectorSpec('css', '.button'));
      const subtask = new Subtask('sub-1', 'Description', [cmd1, cmd2]);

      expect(subtask.getCommandCount()).toBe(2);
    });
  });

  describe('getCommandAt', () => {
    it('should return command at specified index', () => {
      const cmd1 = new OxtestCommand('navigate', { url: 'https://example.com' });
      const cmd2 = new OxtestCommand('click', {}, new SelectorSpec('css', '.button'));
      const subtask = new Subtask('sub-1', 'Description', [cmd1, cmd2]);

      expect(subtask.getCommandAt(0)).toBe(cmd1);
      expect(subtask.getCommandAt(1)).toBe(cmd2);
    });

    it('should return undefined for out of bounds index', () => {
      const cmd = new OxtestCommand('navigate', { url: 'https://example.com' });
      const subtask = new Subtask('sub-1', 'Description', [cmd]);

      expect(subtask.getCommandAt(5)).toBeUndefined();
      expect(subtask.getCommandAt(-1)).toBeUndefined();
    });
  });

  describe('hasInteractionCommands', () => {
    it('should return true when subtask has interaction commands', () => {
      const clickCmd = new OxtestCommand('click', {}, new SelectorSpec('css', '.button'));
      const subtask = new Subtask('sub-1', 'Description', [clickCmd]);

      expect(subtask.hasInteractionCommands()).toBe(true);
    });

    it('should return false when subtask has no interaction commands', () => {
      const navCmd = new OxtestCommand('navigate', { url: 'https://example.com' });
      const waitCmd = new OxtestCommand('wait', { ms: 1000 });
      const subtask = new Subtask('sub-1', 'Description', [navCmd, waitCmd]);

      expect(subtask.hasInteractionCommands()).toBe(false);
    });
  });

  describe('hasAssertionCommands', () => {
    it('should return true when subtask has assertion commands', () => {
      const assertCmd = new OxtestCommand('assertVisible', {}, new SelectorSpec('css', '.message'));
      const subtask = new Subtask('sub-1', 'Description', [assertCmd]);

      expect(subtask.hasAssertionCommands()).toBe(true);
    });

    it('should return false when subtask has no assertion commands', () => {
      const clickCmd = new OxtestCommand('click', {}, new SelectorSpec('css', '.button'));
      const subtask = new Subtask('sub-1', 'Description', [clickCmd]);

      expect(subtask.hasAssertionCommands()).toBe(false);
    });
  });

  describe('clone', () => {
    it('should create a deep copy of the subtask', () => {
      const cmd = new OxtestCommand('click', {}, new SelectorSpec('css', '.button'));
      const subtask = new Subtask('sub-1', 'Description', [cmd]);
      const clone = subtask.clone();

      expect(clone).not.toBe(subtask);
      expect(clone.id).toBe(subtask.id);
      expect(clone.description).toBe(subtask.description);
      expect(clone.commands).not.toBe(subtask.commands);
      expect(clone.commands).toHaveLength(subtask.commands.length);
    });
  });

  describe('toString', () => {
    it('should return string representation of subtask', () => {
      const cmd = new OxtestCommand('click', {}, new SelectorSpec('css', '.button'));
      const subtask = new Subtask('sub-1', 'Click button', [cmd]);

      expect(subtask.toString()).toBe('Subtask[sub-1]: Click button (1 commands)');
    });

    it('should show correct plural form for commands', () => {
      const cmd1 = new OxtestCommand('navigate', { url: 'https://example.com' });
      const cmd2 = new OxtestCommand('click', {}, new SelectorSpec('css', '.button'));
      const subtask = new Subtask('sub-1', 'Multi-step', [cmd1, cmd2]);

      expect(subtask.toString()).toBe('Subtask[sub-1]: Multi-step (2 commands)');
    });
  });

  // Sprint 17: State Machine Tests
  describe('state machine', () => {
    let subtask: Subtask;

    beforeEach(() => {
      const cmd = new OxtestCommand('click', {}, new SelectorSpec('css', '.button'));
      subtask = new Subtask('sub-1', 'Click button', [cmd]);
    });

    describe('initial state', () => {
      it('should start in Pending status', () => {
        expect(subtask.status).toBe(TaskStatus.Pending);
      });

      it('should have no result initially', () => {
        expect(subtask.result).toBeUndefined();
      });

      it('should report isPending as true', () => {
        expect(subtask.isPending()).toBe(true);
      });

      it('should report other states as false', () => {
        expect(subtask.isInProgress()).toBe(false);
        expect(subtask.isCompleted()).toBe(false);
        expect(subtask.isFailed()).toBe(false);
        expect(subtask.isBlocked()).toBe(false);
        expect(subtask.isTerminal()).toBe(false);
      });
    });

    describe('markInProgress', () => {
      it('should transition from Pending to InProgress', () => {
        subtask.markInProgress();

        expect(subtask.status).toBe(TaskStatus.InProgress);
        expect(subtask.isInProgress()).toBe(true);
      });

      it('should record execution start time', async () => {
        subtask.markInProgress();

        // Wait a bit then mark completed to verify duration
        await new Promise(resolve => setTimeout(resolve, 50));
        subtask.markCompleted({ success: true });

        expect(subtask.result?.duration).toBeGreaterThanOrEqual(50);
        expect(subtask.result?.duration).toBeLessThan(200);
      });

      it('should throw error when transitioning from Completed', () => {
        subtask.markInProgress();
        subtask.markCompleted({ success: true });

        expect(() => subtask.markInProgress()).toThrow('Invalid state transition');
        expect(() => subtask.markInProgress()).toThrow('completed → in_progress');
      });

      it('should throw error when transitioning from Failed', () => {
        subtask.markInProgress();
        subtask.markFailed(new Error('Test error'));

        expect(() => subtask.markInProgress()).toThrow('Invalid state transition');
      });

      it('should allow retry from Blocked', () => {
        subtask.markBlocked('Dependencies not met');
        expect(subtask.isBlocked()).toBe(true);

        subtask.markInProgress();
        expect(subtask.isInProgress()).toBe(true);
      });
    });

    describe('markCompleted', () => {
      it('should transition from InProgress to Completed', () => {
        subtask.markInProgress();
        subtask.markCompleted({ success: true, output: 'Success' });

        expect(subtask.status).toBe(TaskStatus.Completed);
        expect(subtask.isCompleted()).toBe(true);
        expect(subtask.isTerminal()).toBe(true);
      });

      it('should store execution result', () => {
        subtask.markInProgress();
        subtask.markCompleted({
          success: true,
          output: 'Test passed',
          screenshots: ['/tmp/screenshot.png']
        });

        expect(subtask.result).toBeDefined();
        expect(subtask.result?.success).toBe(true);
        expect(subtask.result?.output).toBe('Test passed');
        expect(subtask.result?.screenshots).toEqual(['/tmp/screenshot.png']);
      });

      it('should set timestamp', () => {
        subtask.markInProgress();
        const before = new Date();
        subtask.markCompleted({ success: true });
        const after = new Date();

        expect(subtask.result?.timestamp).toBeDefined();
        expect(subtask.result?.timestamp!.getTime()).toBeGreaterThanOrEqual(before.getTime());
        expect(subtask.result?.timestamp!.getTime()).toBeLessThanOrEqual(after.getTime());
      });

      it('should calculate execution duration', async () => {
        subtask.markInProgress();
        await new Promise(resolve => setTimeout(resolve, 100));
        subtask.markCompleted({ success: true });

        expect(subtask.result?.duration).toBeGreaterThanOrEqual(100);
      });

      it('should throw error when transitioning from Pending', () => {
        expect(() => subtask.markCompleted({ success: true })).toThrow('Invalid state transition');
        expect(() => subtask.markCompleted({ success: true })).toThrow('pending → completed');
      });
    });

    describe('markFailed', () => {
      it('should transition from InProgress to Failed', () => {
        subtask.markInProgress();
        subtask.markFailed(new Error('Execution failed'));

        expect(subtask.status).toBe(TaskStatus.Failed);
        expect(subtask.isFailed()).toBe(true);
        expect(subtask.isTerminal()).toBe(true);
      });

      it('should store error in result', () => {
        subtask.markInProgress();
        const error = new Error('Test error');
        subtask.markFailed(error);

        expect(subtask.result).toBeDefined();
        expect(subtask.result?.success).toBe(false);
        expect(subtask.result?.error).toBe(error);
      });

      it('should store additional result data', () => {
        subtask.markInProgress();
        subtask.markFailed(new Error('Failed'), {
          output: 'Failed at step 2',
          screenshots: ['/tmp/error.png']
        });

        expect(subtask.result?.output).toBe('Failed at step 2');
        expect(subtask.result?.screenshots).toEqual(['/tmp/error.png']);
      });

      it('should set timestamp and duration', async () => {
        subtask.markInProgress();
        await new Promise(resolve => setTimeout(resolve, 50));
        subtask.markFailed(new Error('Failed'));

        expect(subtask.result?.timestamp).toBeDefined();
        expect(subtask.result?.duration).toBeGreaterThanOrEqual(50);
      });

      it('should throw error when transitioning from Pending', () => {
        expect(() => subtask.markFailed(new Error('Error'))).toThrow('Invalid state transition');
      });
    });

    describe('markBlocked', () => {
      it('should transition from Pending to Blocked', () => {
        subtask.markBlocked('Dependencies not met');

        expect(subtask.status).toBe(TaskStatus.Blocked);
        expect(subtask.isBlocked()).toBe(true);
      });

      it('should store block reason in result', () => {
        subtask.markBlocked('Missing prerequisite');

        expect(subtask.result).toBeDefined();
        expect(subtask.result?.success).toBe(false);
        expect(subtask.result?.error?.message).toContain('Blocked');
        expect(subtask.result?.error?.message).toContain('Missing prerequisite');
      });

      it('should set timestamp', () => {
        const before = new Date();
        subtask.markBlocked('Blocked');
        const after = new Date();

        expect(subtask.result?.timestamp).toBeDefined();
        expect(subtask.result?.timestamp!.getTime()).toBeGreaterThanOrEqual(before.getTime());
        expect(subtask.result?.timestamp!.getTime()).toBeLessThanOrEqual(after.getTime());
      });

      it('should throw error when transitioning from InProgress', () => {
        subtask.markInProgress();
        expect(() => subtask.markBlocked('Blocked')).toThrow('Invalid state transition');
      });
    });

    describe('state query methods', () => {
      it('should correctly report InProgress state', () => {
        subtask.markInProgress();

        expect(subtask.isPending()).toBe(false);
        expect(subtask.isInProgress()).toBe(true);
        expect(subtask.isCompleted()).toBe(false);
        expect(subtask.isFailed()).toBe(false);
        expect(subtask.isBlocked()).toBe(false);
        expect(subtask.isTerminal()).toBe(false);
      });

      it('should correctly report Completed state', () => {
        subtask.markInProgress();
        subtask.markCompleted({ success: true });

        expect(subtask.isPending()).toBe(false);
        expect(subtask.isInProgress()).toBe(false);
        expect(subtask.isCompleted()).toBe(true);
        expect(subtask.isFailed()).toBe(false);
        expect(subtask.isBlocked()).toBe(false);
        expect(subtask.isTerminal()).toBe(true);
      });

      it('should correctly report Failed state', () => {
        subtask.markInProgress();
        subtask.markFailed(new Error('Error'));

        expect(subtask.isPending()).toBe(false);
        expect(subtask.isInProgress()).toBe(false);
        expect(subtask.isCompleted()).toBe(false);
        expect(subtask.isFailed()).toBe(true);
        expect(subtask.isBlocked()).toBe(false);
        expect(subtask.isTerminal()).toBe(true);
      });

      it('should correctly report Blocked state', () => {
        subtask.markBlocked('Blocked');

        expect(subtask.isPending()).toBe(false);
        expect(subtask.isInProgress()).toBe(false);
        expect(subtask.isCompleted()).toBe(false);
        expect(subtask.isFailed()).toBe(false);
        expect(subtask.isBlocked()).toBe(true);
        expect(subtask.isTerminal()).toBe(false);
      });
    });

    describe('full lifecycle scenarios', () => {
      it('should support successful execution flow', () => {
        expect(subtask.isPending()).toBe(true);

        subtask.markInProgress();
        expect(subtask.isInProgress()).toBe(true);

        subtask.markCompleted({ success: true });
        expect(subtask.isCompleted()).toBe(true);
        expect(subtask.isTerminal()).toBe(true);
      });

      it('should support failure flow', () => {
        expect(subtask.isPending()).toBe(true);

        subtask.markInProgress();
        expect(subtask.isInProgress()).toBe(true);

        subtask.markFailed(new Error('Failed'));
        expect(subtask.isFailed()).toBe(true);
        expect(subtask.isTerminal()).toBe(true);
      });

      it('should support blocked and retry flow', () => {
        expect(subtask.isPending()).toBe(true);

        subtask.markBlocked('Dependencies not met');
        expect(subtask.isBlocked()).toBe(true);

        // Retry after dependencies are met
        subtask.markInProgress();
        expect(subtask.isInProgress()).toBe(true);

        subtask.markCompleted({ success: true });
        expect(subtask.isCompleted()).toBe(true);
      });
    });
  });
});
