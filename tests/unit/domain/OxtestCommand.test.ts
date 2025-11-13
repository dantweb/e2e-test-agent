import { OxtestCommand } from '../../../src/domain/entities/OxtestCommand';
import { CommandType } from '../../../src/domain/enums/CommandType';
import { SelectorSpec } from '../../../src/domain/entities/SelectorSpec';

describe('OxtestCommand', () => {
  describe('constructor', () => {
    it('should create a navigation command', () => {
      const cmd = new OxtestCommand('navigate', { url: 'https://example.com' });

      expect(cmd.type).toBe('navigate');
      expect(cmd.params).toEqual({ url: 'https://example.com' });
      expect(cmd.selector).toBeUndefined();
    });

    it('should create a click command with selector', () => {
      const selector = new SelectorSpec('css', '.submit-button');
      const cmd = new OxtestCommand('click', {}, selector);

      expect(cmd.type).toBe('click');
      expect(cmd.selector).toBeDefined();
      expect(cmd.selector?.strategy).toBe('css');
      expect(cmd.selector?.value).toBe('.submit-button');
    });

    it('should create a fill command with value', () => {
      const selector = new SelectorSpec('css', '#email');
      const cmd = new OxtestCommand('fill', { value: 'test@example.com' }, selector);

      expect(cmd.type).toBe('fill');
      expect(cmd.params.value).toBe('test@example.com');
      expect(cmd.selector?.value).toBe('#email');
    });

    it('should create an assertion command', () => {
      const selector = new SelectorSpec('text', 'Welcome');
      const cmd = new OxtestCommand('assertVisible', {}, selector);

      expect(cmd.type).toBe('assertVisible');
      expect(cmd.selector?.strategy).toBe('text');
    });
  });

  describe('validation', () => {
    it('should reject empty command type', () => {
      expect(() => new OxtestCommand('' as CommandType, {})).toThrow(
        'Command type cannot be empty'
      );
    });

    it('should reject invalid command type', () => {
      expect(() => new OxtestCommand('invalidCmd' as CommandType, {})).toThrow(
        'Invalid command type'
      );
    });

    it('should require selector for interaction commands', () => {
      expect(() => new OxtestCommand('click', {})).toThrow(
        'Selector is required for click commands'
      );
    });

    it('should require url parameter for navigate command', () => {
      expect(() => new OxtestCommand('navigate', {})).toThrow(
        'url parameter is required for navigate commands'
      );
    });

    it('should require value parameter for fill command', () => {
      const selector = new SelectorSpec('css', '#input');
      expect(() => new OxtestCommand('fill', {}, selector)).toThrow(
        'value parameter is required for fill commands'
      );
    });
  });

  describe('isInteractionCommand', () => {
    it('should return true for click command', () => {
      const selector = new SelectorSpec('css', '.btn');
      const cmd = new OxtestCommand('click', {}, selector);
      expect(cmd.isInteractionCommand()).toBe(true);
    });

    it('should return true for fill command', () => {
      const selector = new SelectorSpec('css', '#input');
      const cmd = new OxtestCommand('fill', { value: 'text' }, selector);
      expect(cmd.isInteractionCommand()).toBe(true);
    });

    it('should return false for navigate command', () => {
      const cmd = new OxtestCommand('navigate', { url: 'https://example.com' });
      expect(cmd.isInteractionCommand()).toBe(false);
    });

    it('should return false for wait command', () => {
      const cmd = new OxtestCommand('wait', { ms: 1000 });
      expect(cmd.isInteractionCommand()).toBe(false);
    });
  });

  describe('isAssertionCommand', () => {
    it('should return true for assertVisible command', () => {
      const selector = new SelectorSpec('css', '.element');
      const cmd = new OxtestCommand('assertVisible', {}, selector);
      expect(cmd.isAssertionCommand()).toBe(true);
    });

    it('should return true for assertText command', () => {
      const selector = new SelectorSpec('css', '.text');
      const cmd = new OxtestCommand('assertText', { expected: 'Hello' }, selector);
      expect(cmd.isAssertionCommand()).toBe(true);
    });

    it('should return false for click command', () => {
      const selector = new SelectorSpec('css', '.btn');
      const cmd = new OxtestCommand('click', {}, selector);
      expect(cmd.isAssertionCommand()).toBe(false);
    });
  });

  describe('clone', () => {
    it('should create a deep copy of the command', () => {
      const selector = new SelectorSpec('css', '.button');
      const cmd = new OxtestCommand('click', { force: true }, selector);
      const clone = cmd.clone();

      expect(clone).not.toBe(cmd);
      expect(clone.type).toBe(cmd.type);
      expect(clone.params).toEqual(cmd.params);
      expect(clone.params).not.toBe(cmd.params);
      expect(clone.selector).toBeDefined();
      expect(clone.selector).not.toBe(cmd.selector);
    });
  });

  describe('toString', () => {
    it('should return command string for navigate', () => {
      const cmd = new OxtestCommand('navigate', { url: 'https://example.com' });
      expect(cmd.toString()).toBe('navigate(url=https://example.com)');
    });

    it('should return command string for click with selector', () => {
      const selector = new SelectorSpec('css', '.button');
      const cmd = new OxtestCommand('click', {}, selector);
      expect(cmd.toString()).toBe('click(css:.button)');
    });

    it('should return command string for fill with value', () => {
      const selector = new SelectorSpec('css', '#input');
      const cmd = new OxtestCommand('fill', { value: 'test' }, selector);
      expect(cmd.toString()).toContain('fill(css:#input, value=test)');
    });
  });
});
