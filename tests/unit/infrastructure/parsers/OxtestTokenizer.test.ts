import { OxtestTokenizer } from '../../../../src/infrastructure/parsers/OxtestTokenizer';

describe('OxtestTokenizer', () => {
  let tokenizer: OxtestTokenizer;

  beforeEach(() => {
    tokenizer = new OxtestTokenizer();
  });

  describe('tokenize', () => {
    it('should tokenize simple command', () => {
      const line = 'navigate url=https://example.com';
      const tokens = tokenizer.tokenize(line);

      expect(tokens).toHaveLength(2);
      expect(tokens[0]).toEqual({
        type: 'COMMAND',
        value: 'navigate',
      });
      expect(tokens[1]).toEqual({
        type: 'PARAM',
        key: 'url',
        value: 'https://example.com',
      });
    });

    it('should tokenize command with selector', () => {
      const line = 'click css=button.submit timeout=5000';
      const tokens = tokenizer.tokenize(line);

      expect(tokens).toHaveLength(3);
      expect(tokens[0].type).toBe('COMMAND');
      expect(tokens[0].value).toBe('click');
      expect(tokens[1].type).toBe('SELECTOR');
      expect(tokens[1].strategy).toBe('css');
      expect(tokens[1].value).toBe('button.submit');
      expect(tokens[2].type).toBe('PARAM');
      expect(tokens[2].key).toBe('timeout');
      expect(tokens[2].value).toBe('5000');
    });

    it('should handle fallback selectors', () => {
      const line = 'click text="Login" fallback css=button[type="submit"]';
      const tokens = tokenizer.tokenize(line);

      expect(tokens[0].type).toBe('COMMAND');
      expect(tokens[1].type).toBe('SELECTOR');
      expect(tokens[1].strategy).toBe('text');
      expect(tokens[1].value).toBe('Login');
      expect(tokens[1].fallback).toBeDefined();
      expect(tokens[1].fallback?.strategy).toBe('css');
      expect(tokens[1].fallback?.value).toBe('button[type=submit]');
    });

    it('should handle quoted values with spaces', () => {
      const line = 'type css=input value="Hello World"';
      const tokens = tokenizer.tokenize(line);

      const paramToken = tokens.find(t => t.type === 'PARAM');
      expect(paramToken).toBeDefined();
      expect(paramToken?.key).toBe('value');
      expect(paramToken?.value).toBe('Hello World');
    });

    it('should handle single quotes', () => {
      const line = "type css=input value='Hello World'";
      const tokens = tokenizer.tokenize(line);

      const paramToken = tokens.find(t => t.type === 'PARAM');
      expect(paramToken?.value).toBe('Hello World');
    });

    it('should skip comments', () => {
      const line = '# This is a comment';
      const tokens = tokenizer.tokenize(line);

      expect(tokens).toEqual([]);
    });

    it('should handle empty lines', () => {
      const tokens = tokenizer.tokenize('   \n  ');
      expect(tokens).toEqual([]);
    });

    it('should handle empty string', () => {
      const tokens = tokenizer.tokenize('');
      expect(tokens).toEqual([]);
    });

    it('should tokenize all selector strategies', () => {
      const strategies = ['css', 'xpath', 'text', 'placeholder', 'label', 'role', 'testid'];

      strategies.forEach(strategy => {
        const line = `click ${strategy}=value`;
        const tokens = tokenizer.tokenize(line);

        const selectorToken = tokens.find(t => t.type === 'SELECTOR');
        expect(selectorToken?.strategy).toBe(strategy);
      });
    });

    it('should handle values with equals signs', () => {
      const line = 'type css=input value="key=value"';
      const tokens = tokenizer.tokenize(line);

      const paramToken = tokens.find(t => t.type === 'PARAM');
      expect(paramToken?.value).toBe('key=value');
    });

    it('should handle multiple parameters', () => {
      const line = 'wait timeout=5000 condition=visible';
      const tokens = tokenizer.tokenize(line);

      expect(tokens).toHaveLength(3);
      expect(tokens[0].type).toBe('COMMAND');
      expect(tokens[1].type).toBe('PARAM');
      expect(tokens[2].type).toBe('PARAM');
    });

    it('should handle command without parameters', () => {
      const line = 'wait_navigation';
      const tokens = tokenizer.tokenize(line);

      expect(tokens).toHaveLength(1);
      expect(tokens[0]).toEqual({
        type: 'COMMAND',
        value: 'wait', // wait_navigation is normalized to 'wait'
      });
    });

    it('should handle escaped quotes in values', () => {
      const line = 'type css=input value="Say \\"Hello\\""';
      const tokens = tokenizer.tokenize(line);

      const paramToken = tokens.find(t => t.type === 'PARAM');
      expect(paramToken?.value).toContain('Hello');
    });

    it('should handle selector with special characters', () => {
      const line = 'click css=button[data-test="submit"]';
      const tokens = tokenizer.tokenize(line);

      const selectorToken = tokens.find(t => t.type === 'SELECTOR');
      expect(selectorToken?.value).toBe('button[data-test=submit]');
    });

    it('should handle xpath selector', () => {
      const line = 'click xpath=//button[@type="submit"]';
      const tokens = tokenizer.tokenize(line);

      const selectorToken = tokens.find(t => t.type === 'SELECTOR');
      expect(selectorToken?.strategy).toBe('xpath');
      expect(selectorToken?.value).toBe('//button[@type=submit]');
    });

    it('should handle text selector with quotes', () => {
      const line = 'click text="Click Me"';
      const tokens = tokenizer.tokenize(line);

      const selectorToken = tokens.find(t => t.type === 'SELECTOR');
      expect(selectorToken?.strategy).toBe('text');
      expect(selectorToken?.value).toBe('Click Me');
    });

    it('should handle role selector', () => {
      const line = 'click role=button';
      const tokens = tokenizer.tokenize(line);

      const selectorToken = tokens.find(t => t.type === 'SELECTOR');
      expect(selectorToken?.strategy).toBe('role');
      expect(selectorToken?.value).toBe('button');
    });

    it('should handle testid selector', () => {
      const line = 'click testid=submit-btn';
      const tokens = tokenizer.tokenize(line);

      const selectorToken = tokens.find(t => t.type === 'SELECTOR');
      expect(selectorToken?.strategy).toBe('testid');
      expect(selectorToken?.value).toBe('submit-btn');
    });
  });
});
