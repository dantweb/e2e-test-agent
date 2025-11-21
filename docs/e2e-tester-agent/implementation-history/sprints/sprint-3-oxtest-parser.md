# Sprint 3: Oxtest Parser

**Duration**: 1 week (5 days)
**Status**: ⏸️ Not Started
**Dependencies**: Sprint 1 (Domain Layer)

## Goal

Implement a robust parser for .ox.test files that converts oxtest syntax into OxtestCommand domain objects.

## Tasks

### Day 1: Tokenizer

#### Task 1: Lexical Tokenizer ⏸️

**TDD Approach**:
```typescript
// tests/unit/infrastructure/OxtestTokenizer.test.ts
describe('OxtestTokenizer', () => {
  let tokenizer: OxtestTokenizer;

  beforeEach(() => {
    tokenizer = new OxtestTokenizer();
  });

  it('should tokenize simple command', () => {
    const line = 'navigate url=https://example.com';
    const tokens = tokenizer.tokenize(line);

    expect(tokens).toEqual([
      { type: 'COMMAND', value: 'navigate' },
      { type: 'PARAM', key: 'url', value: 'https://example.com' }
    ]);
  });

  it('should tokenize command with selector', () => {
    const line = 'click css=button.submit timeout=5000';
    const tokens = tokenizer.tokenize(line);

    expect(tokens).toEqual([
      { type: 'COMMAND', value: 'click' },
      { type: 'SELECTOR', strategy: 'css', value: 'button.submit' },
      { type: 'PARAM', key: 'timeout', value: '5000' }
    ]);
  });

  it('should handle fallback selectors', () => {
    const line = 'click text="Login" fallback=css=button[type="submit"]';
    const tokens = tokenizer.tokenize(line);

    expect(tokens[1].type).toBe('SELECTOR');
    expect(tokens[1].fallback).toBeDefined();
  });

  it('should handle quoted values with spaces', () => {
    const line = 'type css=input value="Hello World"';
    const tokens = tokenizer.tokenize(line);

    const paramToken = tokens.find(t => t.type === 'PARAM');
    expect(paramToken.value).toBe('Hello World');
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
});
```

**Implementation** (src/infrastructure/parsers/OxtestTokenizer.ts):
```typescript
export type TokenType = 'COMMAND' | 'SELECTOR' | 'PARAM' | 'COMMENT';

export interface Token {
  type: TokenType;
  value?: string;
  key?: string;
  strategy?: string;
  fallback?: Token;
}

export class OxtestTokenizer {
  private readonly selectorStrategies = [
    'css', 'xpath', 'text', 'placeholder', 'label', 'role', 'testid'
  ];

  tokenize(line: string): Token[] {
    const trimmed = line.trim();

    // Skip empty lines and comments
    if (!trimmed || trimmed.startsWith('#')) {
      return [];
    }

    const tokens: Token[] = [];
    const parts = this.splitLine(trimmed);

    // First part is always the command
    tokens.push({ type: 'COMMAND', value: parts[0] });

    for (let i = 1; i < parts.length; i++) {
      const part = parts[i];

      if (this.isSelectorToken(part)) {
        tokens.push(this.parseSelector(part, parts, i));
      } else if (this.isParamToken(part)) {
        tokens.push(this.parseParam(part));
      }
    }

    return tokens;
  }

  private splitLine(line: string): string[] {
    const parts: string[] = [];
    let current = '';
    let inQuotes = false;
    let quoteChar = '';

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if ((char === '"' || char === "'") && line[i - 1] !== '\\') {
        if (!inQuotes) {
          inQuotes = true;
          quoteChar = char;
        } else if (char === quoteChar) {
          inQuotes = false;
          quoteChar = '';
        }
        continue;
      }

      if (char === ' ' && !inQuotes) {
        if (current) {
          parts.push(current);
          current = '';
        }
      } else {
        current += char;
      }
    }

    if (current) {
      parts.push(current);
    }

    return parts;
  }

  private isSelectorToken(part: string): boolean {
    return this.selectorStrategies.some(s => part.startsWith(`${s}=`));
  }

  private isParamToken(part: string): boolean {
    return part.includes('=') && !this.isSelectorToken(part);
  }

  private parseSelector(part: string, allParts: string[], index: number): Token {
    const [strategy, value] = part.split('=', 2);

    const token: Token = {
      type: 'SELECTOR',
      strategy,
      value
    };

    // Check for fallback
    if (index + 2 < allParts.length && allParts[index + 1] === 'fallback') {
      const fallbackPart = allParts[index + 2];
      if (this.isSelectorToken(fallbackPart)) {
        token.fallback = this.parseSelector(fallbackPart, [], 0);
      }
    }

    return token;
  }

  private parseParam(part: string): Token {
    const [key, ...valueParts] = part.split('=');
    return {
      type: 'PARAM',
      key,
      value: valueParts.join('=') // Handle = in values
    };
  }
}
```

**Acceptance Criteria**:
- [ ] Tokenize commands
- [ ] Tokenize selectors with strategies
- [ ] Handle fallback chains
- [ ] Parse quoted values
- [ ] Skip comments and empty lines
- [ ] 100% test coverage

**Estimated Time**: 4 hours

---

### Day 2: Command Parser

#### Task 2: Command Parser ⏸️

**TDD Approach**:
```typescript
// tests/unit/infrastructure/OxtestCommandParser.test.ts
describe('OxtestCommandParser', () => {
  let parser: OxtestCommandParser;

  beforeEach(() => {
    parser = new OxtestCommandParser();
  });

  it('should parse navigate command', () => {
    const tokens = [
      { type: 'COMMAND' as const, value: 'navigate' },
      { type: 'PARAM' as const, key: 'url', value: 'https://example.com' }
    ];

    const command = parser.parse(tokens, 1);

    expect(command.command).toBe('navigate');
    expect(command.params.url).toBe('https://example.com');
    expect(command.line).toBe(1);
  });

  it('should parse click with selector', () => {
    const tokens = [
      { type: 'COMMAND' as const, value: 'click' },
      { type: 'SELECTOR' as const, strategy: 'css', value: 'button.submit' }
    ];

    const command = parser.parse(tokens, 2);

    expect(command.command).toBe('click');
    expect(command.selector).toBeDefined();
    expect(command.selector?.strategy).toBe('css');
  });

  it('should parse type with value', () => {
    const tokens = [
      { type: 'COMMAND' as const, value: 'type' },
      { type: 'SELECTOR' as const, strategy: 'css', value: 'input' },
      { type: 'PARAM' as const, key: 'value', value: 'test' }
    ];

    const command = parser.parse(tokens, 3);

    expect(command.command).toBe('type');
    expect(command.params.value).toBe('test');
  });

  it('should handle selector with fallback', () => {
    const tokens = [
      { type: 'COMMAND' as const, value: 'click' },
      {
        type: 'SELECTOR' as const,
        strategy: 'text',
        value: 'Login',
        fallback: {
          type: 'SELECTOR' as const,
          strategy: 'css',
          value: 'button[type="submit"]'
        }
      }
    ];

    const command = parser.parse(tokens, 1);

    expect(command.selector?.fallback).toBeDefined();
  });

  it('should throw on invalid command', () => {
    const tokens = [
      { type: 'COMMAND' as const, value: 'invalid_command' }
    ];

    expect(() => parser.parse(tokens, 1))
      .toThrow('Unknown command: invalid_command');
  });

  it('should throw on missing required params', () => {
    const tokens = [
      { type: 'COMMAND' as const, value: 'navigate' }
    ];

    expect(() => parser.parse(tokens, 1))
      .toThrow('Missing required parameter: url');
  });
});
```

**Implementation** (src/infrastructure/parsers/OxtestCommandParser.ts):
```typescript
import { OxtestCommand } from '../../domain/models/OxtestCommand';
import { SelectorSpec } from '../../domain/models/SelectorSpec';
import { Token } from './OxtestTokenizer';

export class OxtestCommandParser {
  private readonly validCommands = [
    'navigate', 'click', 'type', 'hover', 'keypress',
    'wait', 'wait_navigation', 'wait_for',
    'assert_exists', 'assert_not_exists', 'assert_visible',
    'assert_text', 'assert_value', 'assert_url'
  ];

  parse(tokens: Token[], lineNumber: number): OxtestCommand {
    if (tokens.length === 0) {
      throw new Error(`Line ${lineNumber}: No tokens to parse`);
    }

    const commandToken = tokens[0];
    if (commandToken.type !== 'COMMAND') {
      throw new Error(`Line ${lineNumber}: Expected command token`);
    }

    const commandName = commandToken.value!;
    if (!this.validCommands.includes(commandName)) {
      throw new Error(`Unknown command: ${commandName} at line ${lineNumber}`);
    }

    const selectorToken = tokens.find(t => t.type === 'SELECTOR');
    const paramTokens = tokens.filter(t => t.type === 'PARAM');

    const selector = selectorToken ? this.buildSelector(selectorToken) : undefined;
    const params = this.buildParams(paramTokens);

    this.validateCommand(commandName, selector, params, lineNumber);

    return this.buildCommand(commandName, selector, params, lineNumber);
  }

  private buildSelector(token: Token): SelectorSpec {
    let spec = this.createSelectorSpec(token.strategy!, token.value!);

    if (token.fallback) {
      const fallback = this.buildSelector(token.fallback);
      spec = spec.withFallback(fallback);
    }

    return spec;
  }

  private createSelectorSpec(strategy: string, value: string): SelectorSpec {
    switch (strategy) {
      case 'css': return SelectorSpec.css(value);
      case 'xpath': return SelectorSpec.xpath(value);
      case 'text': return SelectorSpec.text(value);
      default: return SelectorSpec.create(strategy as any, value);
    }
  }

  private buildParams(tokens: Token[]): Record<string, string> {
    const params: Record<string, string> = {};
    for (const token of tokens) {
      if (token.key) {
        params[token.key] = token.value!;
      }
    }
    return params;
  }

  private validateCommand(
    command: string,
    selector: SelectorSpec | undefined,
    params: Record<string, string>,
    line: number
  ): void {
    // Validate navigate has url
    if (command === 'navigate' && !params.url) {
      throw new Error(`Line ${line}: Missing required parameter: url`);
    }

    // Validate type has value
    if (command === 'type' && !params.value) {
      throw new Error(`Line ${line}: Missing required parameter: value`);
    }

    // Validate commands that need selector
    const needsSelector = ['click', 'type', 'hover', 'assert_exists', 'assert_visible'];
    if (needsSelector.includes(command) && !selector) {
      throw new Error(`Line ${line}: ${command} requires a selector`);
    }
  }

  private buildCommand(
    command: string,
    selector: SelectorSpec | undefined,
    params: Record<string, string>,
    line: number
  ): OxtestCommand {
    switch (command) {
      case 'navigate':
        return OxtestCommand.navigate(params.url, line);
      case 'click':
        return OxtestCommand.click(selector!, line, params.timeout ? parseInt(params.timeout) : undefined);
      case 'type':
        return OxtestCommand.type(selector!, params.value, line);
      default:
        // Generic command creation
        return new OxtestCommand(line, command as any, selector, params);
    }
  }
}
```

**Acceptance Criteria**:
- [ ] Parse all command types
- [ ] Validate required parameters
- [ ] Build selector with fallbacks
- [ ] Helpful error messages
- [ ] 100% test coverage

**Estimated Time**: 5 hours

---

### Day 3-4: Full Parser

#### Task 3: OxtestParser (Full File Parser) ⏸️

**TDD Approach**:
```typescript
// tests/unit/infrastructure/OxtestParser.test.ts
describe('OxtestParser', () => {
  let parser: OxtestParser;

  beforeEach(() => {
    parser = new OxtestParser();
  });

  it('should parse complete oxtest file', async () => {
    const oxtest = `
# Login test
navigate url=https://shop.dev
type css=input[name="username"] value=admin
type css=input[type="password"] value=secret
click text="Login" fallback=css=button[type="submit"]
wait_navigation timeout=5000
assert_url pattern=.*/home
assert_not_exists css=.error
`;

    const commands = await parser.parseContent(oxtest);

    expect(commands).toHaveLength(6);
    expect(commands[0].command).toBe('navigate');
    expect(commands[5].command).toBe('assert_not_exists');
  });

  it('should parse from file', async () => {
    const commands = await parser.parseFile('./fixtures/login-test.ox.test');
    expect(commands.length).toBeGreaterThan(0);
  });

  it('should preserve line numbers', async () => {
    const oxtest = `
# Comment on line 1
navigate url=https://shop.dev
click css=button
`;

    const commands = await parser.parseContent(oxtest);

    expect(commands[0].line).toBe(2); // navigate
    expect(commands[1].line).toBe(3); // click
  });

  it('should throw on parse error with line number', async () => {
    const oxtest = `
navigate url=https://shop.dev
invalid_command css=button
click css=button.submit
`;

    await expect(parser.parseContent(oxtest))
      .rejects
      .toThrow('Line 2: Unknown command: invalid_command');
  });

  it('should handle empty file', async () => {
    const commands = await parser.parseContent('');
    expect(commands).toEqual([]);
  });

  it('should handle file with only comments', async () => {
    const oxtest = `
# Comment 1
# Comment 2
# Comment 3
`;

    const commands = await parser.parseContent(oxtest);
    expect(commands).toEqual([]);
  });
});
```

**Implementation** (src/infrastructure/parsers/OxtestParser.ts):
```typescript
import * as fs from 'fs/promises';
import { OxtestCommand } from '../../domain/models/OxtestCommand';
import { OxtestTokenizer } from './OxtestTokenizer';
import { OxtestCommandParser } from './OxtestCommandParser';

export class OxtestParser {
  private readonly tokenizer: OxtestTokenizer;
  private readonly commandParser: OxtestCommandParser;

  constructor() {
    this.tokenizer = new OxtestTokenizer();
    this.commandParser = new OxtestCommandParser();
  }

  async parseFile(filePath: string): Promise<ReadonlyArray<OxtestCommand>> {
    const content = await fs.readFile(filePath, 'utf-8');
    return this.parseContent(content);
  }

  async parseContent(content: string): Promise<ReadonlyArray<OxtestCommand>> {
    const lines = content.split('\n');
    const commands: OxtestCommand[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNumber = i + 1;

      try {
        const tokens = this.tokenizer.tokenize(line);

        if (tokens.length === 0) {
          continue; // Skip empty lines and comments
        }

        const command = this.commandParser.parse(tokens, lineNumber);
        commands.push(command);
      } catch (error) {
        throw new Error(`Line ${lineNumber}: ${(error as Error).message}`);
      }
    }

    return commands;
  }
}
```

**Acceptance Criteria**:
- [ ] Parse complete files
- [ ] Handle comments and empty lines
- [ ] Preserve line numbers
- [ ] Error handling with context
- [ ] 100% test coverage

**Estimated Time**: 4 hours

---

#### Task 4: Manifest Parser ⏸️

**TDD Approach**:
```typescript
// tests/unit/infrastructure/ManifestParser.test.ts
describe('ManifestParser', () => {
  it('should parse manifest.json', async () => {
    const manifestContent = {
      name: 'Login Test',
      description: 'Test login flow',
      timestamp: '2025-11-13T10:00:00Z',
      tests: [
        {
          id: 'test-1',
          name: 'Login flow',
          oxtestFile: 'login-test.ox.test',
          validations: [
            { type: 'url', pattern: '.*/home' }
          ]
        }
      ]
    };

    const parser = new ManifestParser();
    const manifest = parser.parse(JSON.stringify(manifestContent));

    expect(manifest.tests).toHaveLength(1);
    expect(manifest.tests[0].oxtestFile).toBe('login-test.ox.test');
  });

  it('should validate manifest schema', () => {
    const invalid = { name: 'Test' }; // missing required fields

    const parser = new ManifestParser();
    expect(() => parser.parse(JSON.stringify(invalid)))
      .toThrow('Invalid manifest');
  });
});
```

**Implementation** (src/infrastructure/parsers/ManifestParser.ts):
```typescript
import { z } from 'zod';

const ManifestTestSchema = z.object({
  id: z.string(),
  name: z.string(),
  oxtestFile: z.string(),
  validations: z.array(z.object({
    type: z.string(),
    selector: z.string().optional(),
    pattern: z.string().optional(),
    expected: z.string().optional()
  }))
});

const ManifestSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  timestamp: z.string(),
  tests: z.array(ManifestTestSchema)
});

export type Manifest = z.infer<typeof ManifestSchema>;

export class ManifestParser {
  parse(content: string): Manifest {
    try {
      const json = JSON.parse(content);
      return ManifestSchema.parse(json);
    } catch (error) {
      throw new Error(`Invalid manifest: ${(error as Error).message}`);
    }
  }
}
```

**Acceptance Criteria**:
- [ ] Parse manifest.json
- [ ] Validate schema
- [ ] Type-safe output
- [ ] 100% test coverage

**Estimated Time**: 2 hours

---

### Day 5: Integration Tests

#### Task 5: Parser Integration Tests ⏸️

**TDD Approach**:
```typescript
// tests/integration/infrastructure/OxtestParsingFlow.test.ts
describe('Oxtest Parsing Flow', () => {
  it('should parse complex real-world oxtest', async () => {
    const oxtest = `
# Complete checkout flow
navigate url=https://shop.dev
wait timeout=2000

# Login
type css=input[name="username"] value=admin
type css=input[type="password"] value=secret123
click text="Login" fallback=css=button[type="submit"]
wait_navigation timeout=5000

# Verify logged in
assert_url pattern=.*/home
assert_exists css=.user-menu
assert_not_exists css=.login-form

# Add to cart
click text="Products" fallback=css=a[href="/products"]
wait_for css=.product-list timeout=5000
click css=.product-item:first-child .add-to-cart
wait timeout=1000

# Verify cart
assert_exists css=.cart-badge
assert_text css=.cart-badge value="1"

# Checkout
click css=.cart-icon
wait_for css=.cart-page timeout=3000
click text="Checkout" fallback=css=button.checkout
wait_navigation timeout=5000

# Verify checkout page
assert_url pattern=.*/checkout
assert_exists css=.checkout-form
`;

    const parser = new OxtestParser();
    const commands = await parser.parseContent(oxtest);

    expect(commands.length).toBeGreaterThan(15);

    // Verify types
    expect(commands.some(c => c.command === 'navigate')).toBe(true);
    expect(commands.some(c => c.command === 'click')).toBe(true);
    expect(commands.some(c => c.command === 'assert_exists')).toBe(true);

    // Verify selectors
    const clickCommands = commands.filter(c => c.command === 'click');
    expect(clickCommands.some(c => c.selector?.fallback)).toBe(true);
  });

  it('should handle all selector strategies', async () => {
    const oxtest = `
click css=button.submit
click xpath=//button[@type='submit']
click text="Submit"
click placeholder="Enter email"
click label="Email"
click role=button
click testid=submit-btn
`;

    const parser = new OxtestParser();
    const commands = await parser.parseContent(oxtest);

    expect(commands).toHaveLength(7);
    expect(commands.map(c => c.selector?.strategy)).toEqual([
      'css', 'xpath', 'text', 'placeholder', 'label', 'role', 'testid'
    ]);
  });
});
```

**Acceptance Criteria**:
- [ ] Parse complex real-world files
- [ ] All command types work
- [ ] All selector strategies work
- [ ] Fallback chains work
- [ ] Infrastructure layer 85%+ coverage

**Estimated Time**: 3 hours

---

## Checklist

- [ ] Task 1: Lexical tokenizer
- [ ] Task 2: Command parser
- [ ] Task 3: Full file parser
- [ ] Task 4: Manifest parser
- [ ] Task 5: Integration tests

## Definition of Done

- ✅ Complete oxtest parser implemented
- ✅ All command types supported
- ✅ All selector strategies supported
- ✅ Fallback chains working
- ✅ 85%+ test coverage
- ✅ All tests passing
- ✅ Parse errors include line numbers
- ✅ JSDoc comments complete
- ✅ Code reviewed

## Next Sprint

[Sprint 4: Playwright Executor](./sprint-4-playwright-executor.md)

---

**Last Updated**: November 13, 2025
