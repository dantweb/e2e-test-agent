import { OxtestTokenizer } from '../../../src/infrastructure/parsers/OxtestTokenizer';

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
      expect(tokens[0]).toEqual({ type: 'COMMAND', value: 'navigate' });
      expect(tokens[1]).toEqual({ type: 'PARAM', key: 'url', value: 'https://example.com' });
    });

    it('should tokenize command with selector', () => {
      const line = 'click css=button.submit timeout=5000';
      const tokens = tokenizer.tokenize(line);

      expect(tokens).toHaveLength(3);
      expect(tokens[0]).toEqual({ type: 'COMMAND', value: 'click' });
      expect(tokens[1]).toEqual({ type: 'SELECTOR', strategy: 'css', value: 'button.submit' });
      expect(tokens[2]).toEqual({ type: 'PARAM', key: 'timeout', value: '5000' });
    });

    it('should handle fallback selectors', () => {
      const line = 'click text="Login" fallback css=button[type="submit"]';
      const tokens = tokenizer.tokenize(line);

      expect(tokens).toHaveLength(2);
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

      expect(tokens).toHaveLength(3);
      const paramToken = tokens.find(t => t.type === 'PARAM');
      expect(paramToken?.value).toBe('Hello World');
    });

    it('should handle single quotes', () => {
      const line = "type css=input value='Hello World'";
      const tokens = tokenizer.tokenize(line);

      expect(tokens).toHaveLength(3);
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

    it('should handle blank lines', () => {
      const tokens = tokenizer.tokenize('');
      expect(tokens).toEqual([]);
    });

    it('should tokenize all selector strategies', () => {
      const strategies = ['css', 'xpath', 'text', 'placeholder', 'label', 'role', 'testid'];

      strategies.forEach(strategy => {
        const line = `click ${strategy}=some-value`;
        const tokens = tokenizer.tokenize(line);

        expect(tokens).toHaveLength(2);
        expect(tokens[1].type).toBe('SELECTOR');
        expect(tokens[1].strategy).toBe(strategy);
        expect(tokens[1].value).toBe('some-value');
      });
    });

    it('should handle XPath selectors', () => {
      const line = 'click xpath=//button[@id="submit"]';
      const tokens = tokenizer.tokenize(line);

      expect(tokens).toHaveLength(2);
      expect(tokens[1].type).toBe('SELECTOR');
      expect(tokens[1].strategy).toBe('xpath');
      expect(tokens[1].value).toBe('//button[@id=submit]');
    });

    it('should handle complex parameters', () => {
      const line = 'wait timeout=5000 state=visible';
      const tokens = tokenizer.tokenize(line);

      expect(tokens).toHaveLength(3);
      expect(tokens[0]).toEqual({ type: 'COMMAND', value: 'wait' });
      expect(tokens[1]).toEqual({ type: 'PARAM', key: 'timeout', value: '5000' });
      expect(tokens[2]).toEqual({ type: 'PARAM', key: 'state', value: 'visible' });
    });

    it('should handle quoted selector values', () => {
      const line = 'click text="Submit Form"';
      const tokens = tokenizer.tokenize(line);

      expect(tokens).toHaveLength(2);
      expect(tokens[1].type).toBe('SELECTOR');
      expect(tokens[1].value).toBe('Submit Form');
    });

    it('should handle escaped quotes', () => {
      const line = 'type css=input value="Say \\"Hello\\""';
      const tokens = tokenizer.tokenize(line);

      const paramToken = tokens.find(t => t.type === 'PARAM');
      expect(paramToken?.value).toBe('Say "Hello"');
    });

    it('should handle URLs with equal signs', () => {
      const line = 'navigate url=https://example.com?param=value&other=123';
      const tokens = tokenizer.tokenize(line);

      expect(tokens).toHaveLength(2);
      expect(tokens[1].value).toBe('https://example.com?param=value&other=123');
    });

    it('should handle multiple spaces between tokens', () => {
      const line = 'click    css=button    timeout=5000';
      const tokens = tokenizer.tokenize(line);

      expect(tokens).toHaveLength(3);
      expect(tokens[0].value).toBe('click');
      expect(tokens[1].strategy).toBe('css');
      expect(tokens[2].key).toBe('timeout');
    });
  });
});
