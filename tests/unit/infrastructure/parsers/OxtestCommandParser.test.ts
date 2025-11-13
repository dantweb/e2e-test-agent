import { OxtestCommandParser } from '../../../../src/infrastructure/parsers/OxtestCommandParser';
import { Token } from '../../../../src/infrastructure/parsers/OxtestTokenizer';

describe('OxtestCommandParser', () => {
  let parser: OxtestCommandParser;

  beforeEach(() => {
    parser = new OxtestCommandParser();
  });

  describe('parse', () => {
    it('should parse navigate command', () => {
      const tokens: Token[] = [
        { type: 'COMMAND', value: 'navigate' },
        { type: 'PARAM', key: 'url', value: 'https://example.com' },
      ];

      const command = parser.parse(tokens, 1);

      expect(command.type).toBe('navigate');
      expect(command.params?.url).toBe('https://example.com');
    });

    it('should parse click with selector', () => {
      const tokens: Token[] = [
        { type: 'COMMAND', value: 'click' },
        { type: 'SELECTOR', strategy: 'css', value: 'button.submit' },
      ];

      const command = parser.parse(tokens, 2);

      expect(command.type).toBe('click');
      expect(command.selector).toBeDefined();
      expect(command.selector?.strategy).toBe('css');
      expect(command.selector?.value).toBe('button.submit');
    });

    it('should parse fill with value', () => {
      const tokens: Token[] = [
        { type: 'COMMAND', value: 'fill' },
        { type: 'SELECTOR', strategy: 'css', value: 'input' },
        { type: 'PARAM', key: 'value', value: 'test' },
      ];

      const command = parser.parse(tokens, 3);

      expect(command.type).toBe('fill');
      expect(command.params?.value).toBe('test');
    });

    it('should handle selector with fallback', () => {
      const tokens: Token[] = [
        { type: 'COMMAND', value: 'click' },
        {
          type: 'SELECTOR',
          strategy: 'text',
          value: 'Login',
          fallback: {
            type: 'SELECTOR',
            strategy: 'css',
            value: 'button[type=submit]',
          },
        },
      ];

      const command = parser.parse(tokens, 1);

      expect(command.selector?.fallbacks).toBeDefined();
      expect(command.selector?.fallbacks![0].strategy).toBe('css');
    });

    it('should throw on invalid command', () => {
      const tokens: Token[] = [{ type: 'COMMAND', value: 'invalid_command' }];

      expect(() => parser.parse(tokens, 1)).toThrow('Unknown command: invalid_command');
    });

    it('should throw on missing required params for navigate', () => {
      const tokens: Token[] = [{ type: 'COMMAND', value: 'navigate' }];

      expect(() => parser.parse(tokens, 1)).toThrow('Missing required parameter: url');
    });

    it('should throw on missing required selector for click', () => {
      const tokens: Token[] = [{ type: 'COMMAND', value: 'click' }];

      expect(() => parser.parse(tokens, 1)).toThrow('click requires a selector');
    });

    it('should parse wait with timeout', () => {
      const tokens: Token[] = [
        { type: 'COMMAND', value: 'wait' },
        { type: 'PARAM', key: 'timeout', value: '5000' },
      ];

      const command = parser.parse(tokens, 1);

      expect(command.type).toBe('wait');
      expect(command.params?.timeout).toBe('5000');
    });

    it('should parse assertVisible with selector', () => {
      const tokens: Token[] = [
        { type: 'COMMAND', value: 'assertVisible' },
        { type: 'SELECTOR', strategy: 'css', value: '.element' },
      ];

      const command = parser.parse(tokens, 1);

      expect(command.type).toBe('assertVisible');
      expect(command.selector).toBeDefined();
    });

    it('should parse assertText with value', () => {
      const tokens: Token[] = [
        { type: 'COMMAND', value: 'assertText' },
        { type: 'SELECTOR', strategy: 'css', value: '.title' },
        { type: 'PARAM', key: 'value', value: 'Hello' },
      ];

      const command = parser.parse(tokens, 1);

      expect(command.type).toBe('assertText');
      expect(command.params?.value).toBe('Hello');
    });

    it('should throw on empty token array', () => {
      expect(() => parser.parse([], 1)).toThrow('No tokens to parse');
    });

    it('should parse all selector strategies', () => {
      const strategies = ['css', 'xpath', 'text', 'placeholder', 'role', 'testid'];

      strategies.forEach(strategy => {
        const tokens: Token[] = [
          { type: 'COMMAND', value: 'click' },
          { type: 'SELECTOR', strategy, value: 'test' },
        ];

        const command = parser.parse(tokens, 1);
        expect(command.selector?.strategy).toBe(strategy);
      });
    });

    it('should parse hover command', () => {
      const tokens: Token[] = [
        { type: 'COMMAND', value: 'hover' },
        { type: 'SELECTOR', strategy: 'css', value: '.menu-item' },
      ];

      const command = parser.parse(tokens, 1);

      expect(command.type).toBe('hover');
      expect(command.selector).toBeDefined();
    });

    it('should parse press command', () => {
      const tokens: Token[] = [
        { type: 'COMMAND', value: 'press' },
        { type: 'SELECTOR', strategy: 'css', value: 'input' },
        { type: 'PARAM', key: 'key', value: 'Enter' },
      ];

      const command = parser.parse(tokens, 1);

      expect(command.type).toBe('press');
      expect(command.selector).toBeDefined();
      expect(command.params?.key).toBe('Enter');
    });

    it('should parse waitForSelector with selector and timeout', () => {
      const tokens: Token[] = [
        { type: 'COMMAND', value: 'waitForSelector' },
        { type: 'SELECTOR', strategy: 'css', value: '.loaded' },
        { type: 'PARAM', key: 'timeout', value: '3000' },
      ];

      const command = parser.parse(tokens, 1);

      expect(command.type).toBe('waitForSelector');
      expect(command.selector).toBeDefined();
      expect(command.params?.timeout).toBe('3000');
    });
  });
});
