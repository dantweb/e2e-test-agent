import { Subtask } from '../../../src/domain/entities/Subtask';
import { OxtestCommand } from '../../../src/domain/entities/OxtestCommand';
import { SelectorSpec } from '../../../src/domain/entities/SelectorSpec';

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
});
