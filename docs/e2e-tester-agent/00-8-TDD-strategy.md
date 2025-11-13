# e2e-tester-agent: TDD Strategy and Guidelines

**Version**: 1.0
**Date**: November 13, 2025

## Overview

This document defines the Test-Driven Development (TDD) strategy for implementing e2e-tester-agent. Following strict TDD principles ensures high code quality, comprehensive test coverage, and maintainable architecture.

## Core TDD Principles

### Red-Green-Refactor Cycle

```
1. RED    → Write a failing test
2. GREEN  → Write minimum code to pass
3. REFACTOR → Improve code quality
```

**Never write production code without a failing test first.**

### Testing Pyramid

```
        /\
       /  \     E2E Tests (5%)
      /────\    Integration Tests (15%)
     /──────\   Unit Tests (80%)
    /────────\
```

**Target Distribution**:
- **80% Unit Tests** - Fast, isolated, comprehensive
- **15% Integration Tests** - Component interactions
- **5% E2E Tests** - Full workflow validation

### Coverage Goals

| Layer | Coverage Target | Type |
|-------|----------------|------|
| Domain | 95%+ | Unit |
| Application | 90%+ | Unit + Integration |
| Infrastructure | 85%+ | Unit + Integration |
| Presentation | 80%+ | Integration |
| **Overall** | **90%+** | All |

---

## Layer-by-Layer TDD Strategy

### Layer 1: Configuration (YAML Parser)

**Test First Approach**:

```typescript
// tests/configuration/YamlConfigParser.test.ts

describe('YamlConfigParser', () => {
  describe('parse', () => {
    it('should parse valid YAML file', async () => {
      // RED: Write failing test
      const parser = new YamlConfigParser();
      const result = await parser.parse('test-fixtures/valid.yaml');

      expect(result).toBeDefined();
      expect(result.name).toBe('payment-flow');
      expect(result.jobs).toHaveLength(2);
    });

    it('should throw error for invalid YAML', async () => {
      // RED: Test error handling
      const parser = new YamlConfigParser();

      await expect(parser.parse('invalid.yaml'))
        .rejects
        .toThrow('Invalid YAML syntax');
    });

    it('should validate schema', async () => {
      // RED: Test schema validation
      const parser = new YamlConfigParser();

      await expect(parser.parse('test-fixtures/missing-required.yaml'))
        .rejects
        .toThrow('Missing required field: jobs');
    });
  });
});
```

**Implementation Order**:
1. Write test for basic parsing → RED
2. Implement minimal parser → GREEN
3. Write test for validation → RED
4. Add validation logic → GREEN
5. Refactor for clarity → REFACTOR

**Test Coverage**: 95%+

---

### Layer 2: Domain (Models, Interfaces)

**Test First Approach**:

```typescript
// tests/domain/OxtestCommand.test.ts

describe('OxtestCommand', () => {
  describe('constructor', () => {
    it('should create command with required fields', () => {
      // RED: Write failing test
      const command = new OxtestCommand({
        line: 1,
        command: 'navigate',
        params: { url: 'https://example.com' }
      });

      expect(command.line).toBe(1);
      expect(command.command).toBe('navigate');
      expect(command.params.url).toBe('https://example.com');
    });

    it('should throw error for invalid command type', () => {
      // RED: Test validation
      expect(() => {
        new OxtestCommand({
          line: 1,
          command: 'invalid_command',
          params: {}
        });
      }).toThrow('Invalid command type: invalid_command');
    });
  });

  describe('hasSelector', () => {
    it('should return true when selector present', () => {
      const command = new OxtestCommand({
        line: 1,
        command: 'click',
        selector: { strategy: 'css', value: 'button' },
        params: {}
      });

      expect(command.hasSelector()).toBe(true);
    });
  });
});
```

**Domain-Driven Tests**:
- Test business rules first
- Test invariants (must always be true)
- Test value object equality
- Test entity identity

**Test Coverage**: 95%+

---

### Layer 3: Application (Engines, Orchestrators)

**Test First Approach with Mocks**:

```typescript
// tests/application/IterativeDecompositionEngine.test.ts

describe('IterativeDecompositionEngine', () => {
  let engine: IterativeDecompositionEngine;
  let mockLLMProvider: jest.Mocked<ILLMProvider>;

  beforeEach(() => {
    // Setup mocks
    mockLLMProvider = {
      query: jest.fn(),
      queryStructured: jest.fn()
    } as any;

    engine = new IterativeDecompositionEngine(mockLLMProvider);
  });

  describe('decompose', () => {
    it('should generate oxtest from job definition', async () => {
      // RED: Write failing test
      const job: JobDefinition = {
        name: 'login',
        prompt: 'Login with username and password',
        acceptance: ['you are on the home page']
      };

      // Mock LLM responses
      mockLLMProvider.query
        .mockResolvedValueOnce({ content: 'Initial plan...' })
        .mockResolvedValueOnce({ content: 'navigate url=...' })
        .mockResolvedValueOnce({ content: 'type css=...' });

      const result = await engine.decompose(job);

      expect(result).toContain('navigate');
      expect(result).toContain('type');
      expect(mockLLMProvider.query).toHaveBeenCalledTimes(3);
    });

    it('should retry on validation failure', async () => {
      // RED: Test retry logic
      const job: JobDefinition = {
        name: 'test',
        prompt: 'Test prompt',
        acceptance: ['success']
      };

      mockLLMProvider.query
        .mockResolvedValueOnce({ content: 'bad command' }) // First attempt fails
        .mockResolvedValueOnce({ content: 'navigate url=...' }); // Retry succeeds

      const result = await engine.decompose(job);

      expect(result).toContain('navigate');
      expect(mockLLMProvider.query).toHaveBeenCalledTimes(2);
    });
  });
});
```

**Integration Tests** (with real dependencies):

```typescript
// tests/integration/DecompositionToExecution.integration.test.ts

describe('Decomposition to Execution Integration', () => {
  it('should compile and execute simple test', async () => {
    // Integration test: Real YAML → Real Parser → Mock LLM → Real Executor

    const yamlContent = `
      test-flow:
        url: https://example.com
        jobs:
          - name: navigate
            prompt: Go to homepage
            acceptance: you see the page
    `;

    // Real components
    const parser = new YamlConfigParser();
    const decomposer = new IterativeDecompositionEngine(mockLLM);
    const executor = new SequentialExecutionOrchestrator(mockPlaywright);

    // Parse
    const config = await parser.parseContent(yamlContent);

    // Decompose
    const oxtest = await decomposer.decompose(config.jobs[0]);

    // Execute
    const result = await executor.execute(parseOxtest(oxtest));

    expect(result.success).toBe(true);
  });
});
```

**Test Coverage**: 90%+

---

### Layer 4: Infrastructure (Playwright, LLM)

**Test First with Test Doubles**:

```typescript
// tests/infrastructure/OxtestParser.test.ts

describe('OxtestParser', () => {
  let parser: OxtestParser;

  beforeEach(() => {
    parser = new OxtestParser();
  });

  describe('parse', () => {
    it('should parse simple navigate command', () => {
      // RED: Write failing test
      const oxtest = 'navigate url=https://example.com';

      const commands = parser.parseContent(oxtest);

      expect(commands).toHaveLength(1);
      expect(commands[0].command).toBe('navigate');
      expect(commands[0].params.url).toBe('https://example.com');
    });

    it('should parse command with selector', () => {
      const oxtest = 'click css=button.submit timeout=5000';

      const commands = parser.parseContent(oxtest);

      expect(commands[0].selector).toBeDefined();
      expect(commands[0].selector?.strategy).toBe('css');
      expect(commands[0].selector?.value).toBe('button.submit');
      expect(commands[0].params.timeout).toBe('5000');
    });

    it('should skip comments and empty lines', () => {
      const oxtest = `
        # This is a comment
        navigate url=https://example.com

        # Another comment
        click css=button
      `;

      const commands = parser.parseContent(oxtest);

      expect(commands).toHaveLength(2);
      expect(commands[0].command).toBe('navigate');
      expect(commands[1].command).toBe('click');
    });

    it('should handle quoted values', () => {
      const oxtest = 'log message="This is a test"';

      const commands = parser.parseContent(oxtest);

      expect(commands[0].params.message).toBe('This is a test');
    });
  });
});
```

**Playwright Tests** (with mock browser):

```typescript
// tests/infrastructure/PlaywrightExecutor.test.ts

describe('PlaywrightExecutor', () => {
  let executor: PlaywrightExecutor;
  let mockPage: jest.Mocked<Page>;
  let mockLocator: jest.Mocked<Locator>;

  beforeEach(() => {
    mockLocator = {
      click: jest.fn().mockResolvedValue(undefined),
      fill: jest.fn().mockResolvedValue(undefined),
      waitFor: jest.fn().mockResolvedValue(undefined)
    } as any;

    mockPage = {
      goto: jest.fn().mockResolvedValue(undefined),
      locator: jest.fn().mockReturnValue(mockLocator),
      getByText: jest.fn().mockReturnValue(mockLocator)
    } as any;

    executor = new PlaywrightExecutor(new MultiStrategySelector(), mockLogger);
    executor['page'] = mockPage; // Inject mock
  });

  describe('execute', () => {
    it('should execute navigate command', async () => {
      const command: OxtestCommand = {
        line: 1,
        command: 'navigate',
        params: { url: 'https://example.com' }
      };

      await executor.execute(command);

      expect(mockPage.goto).toHaveBeenCalledWith(
        'https://example.com',
        { waitUntil: 'networkidle' }
      );
    });

    it('should execute click with CSS selector', async () => {
      const command: OxtestCommand = {
        line: 1,
        command: 'click',
        selector: { strategy: 'css', value: 'button.submit' },
        params: {}
      };

      await executor.execute(command);

      expect(mockPage.locator).toHaveBeenCalledWith('button.submit');
      expect(mockLocator.click).toHaveBeenCalled();
    });

    it('should try fallback selector on failure', async () => {
      const command: OxtestCommand = {
        line: 1,
        command: 'click',
        selector: {
          strategy: 'css',
          value: 'button.primary',
          fallback: { strategy: 'text', value: 'Submit' }
        },
        params: {}
      };

      mockPage.locator.mockImplementationOnce(() => {
        throw new Error('Element not found');
      });

      await executor.execute(command);

      expect(mockPage.getByText).toHaveBeenCalledWith('Submit');
      expect(mockLocator.click).toHaveBeenCalled();
    });
  });
});
```

**Test Coverage**: 85%+

---

### Layer 5: Presentation (CLI, Reports)

**Integration Tests**:

```typescript
// tests/presentation/CompileCommand.integration.test.ts

describe('CompileCommand Integration', () => {
  let command: CompileCommand;
  let mockLLM: jest.Mocked<ILLMProvider>;

  beforeEach(() => {
    mockLLM = createMockLLMProvider();
    command = new CompileCommand(
      new YamlConfigParser(),
      new IterativeDecompositionEngine(mockLLM),
      new FileOutputWriter()
    );
  });

  it('should compile YAML to oxtest files', async () => {
    const args: CLIArguments = {
      src: 'test-fixtures/demo.yaml',
      output: '.test-output'
    };

    await command.execute(args);

    // Verify oxtest files created
    expect(fs.existsSync('.test-output/manifest.json')).toBe(true);
    expect(fs.existsSync('.test-output/login-test.ox.test')).toBe(true);

    // Verify content
    const oxtest = fs.readFileSync('.test-output/login-test.ox.test', 'utf-8');
    expect(oxtest).toContain('navigate');
    expect(oxtest).toContain('type');
  });
});
```

**Test Coverage**: 80%+

---

## Test Organization

### Directory Structure

```
tests/
├── unit/
│   ├── domain/
│   │   ├── OxtestCommand.test.ts
│   │   ├── Task.test.ts
│   │   └── ValidationPredicate.test.ts
│   ├── application/
│   │   ├── IterativeDecompositionEngine.test.ts
│   │   ├── SequentialExecutionOrchestrator.test.ts
│   │   └── ValidationEngine.test.ts
│   └── infrastructure/
│       ├── OxtestParser.test.ts
│       ├── PlaywrightExecutor.test.ts
│       └── LLMProviderFactory.test.ts
├── integration/
│   ├── CompilationFlow.integration.test.ts
│   ├── ExecutionFlow.integration.test.ts
│   └── EndToEnd.integration.test.ts
├── e2e/
│   └── FullWorkflow.e2e.test.ts
├── fixtures/
│   ├── valid.yaml
│   ├── invalid.yaml
│   └── sample-oxtest.ox.test
└── helpers/
    ├── mockLLMProvider.ts
    ├── mockPlaywright.ts
    └── testUtils.ts
```

---

## Test Patterns and Best Practices

### 1. Arrange-Act-Assert (AAA)

```typescript
it('should parse command correctly', () => {
  // ARRANGE - Set up test data
  const parser = new OxtestParser();
  const input = 'navigate url=https://example.com';

  // ACT - Execute the behavior
  const result = parser.parseContent(input);

  // ASSERT - Verify the outcome
  expect(result).toHaveLength(1);
  expect(result[0].command).toBe('navigate');
});
```

### 2. Test One Thing

```typescript
// GOOD - Tests one behavior
it('should parse navigate command', () => {
  const result = parser.parseContent('navigate url=https://example.com');
  expect(result[0].command).toBe('navigate');
});

it('should parse click command', () => {
  const result = parser.parseContent('click css=button');
  expect(result[0].command).toBe('click');
});

// BAD - Tests multiple behaviors
it('should parse all commands', () => {
  const result1 = parser.parseContent('navigate url=...');
  const result2 = parser.parseContent('click css=...');
  const result3 = parser.parseContent('type css=...');
  // ... assertions for all
});
```

### 3. Test Naming Convention

```typescript
describe('ClassName', () => {
  describe('methodName', () => {
    it('should [expected behavior] when [condition]', () => {
      // Test implementation
    });
  });
});

// Examples:
it('should throw error when YAML is invalid');
it('should parse command when format is correct');
it('should retry when first attempt fails');
it('should use fallback when primary selector fails');
```

### 4. Use Test Doubles Appropriately

```typescript
// MOCK - Verify interactions
const mockLLM = jest.fn();
mockLLM.mockResolvedValue({ content: '...' });
expect(mockLLM).toHaveBeenCalledWith(...);

// STUB - Provide canned responses
const stubLLM = {
  query: () => Promise.resolve({ content: 'navigate url=...' })
};

// SPY - Monitor real object
const spy = jest.spyOn(realObject, 'method');
expect(spy).toHaveBeenCalled();

// FAKE - Working implementation (lighter than real)
class FakeLLMProvider implements ILLMProvider {
  query() { return Promise.resolve({ content: 'fake response' }); }
}
```

### 5. Test Data Builders

```typescript
// helpers/testDataBuilders.ts

class OxtestCommandBuilder {
  private data: Partial<OxtestCommand> = {
    line: 1,
    command: 'navigate',
    params: {}
  };

  withCommand(command: string): this {
    this.data.command = command;
    return this;
  }

  withSelector(selector: SelectorSpec): this {
    this.data.selector = selector;
    return this;
  }

  build(): OxtestCommand {
    return new OxtestCommand(this.data as any);
  }
}

// Usage in tests:
const command = new OxtestCommandBuilder()
  .withCommand('click')
  .withSelector({ strategy: 'css', value: 'button' })
  .build();
```

---

## TDD Workflow

### Daily Development Cycle

```
Morning:
1. Review sprint goals
2. Select next feature from backlog
3. Write failing test (RED)
4. Run test suite → Verify failure
5. Implement minimal code (GREEN)
6. Run test suite → Verify pass
7. Refactor (REFACTOR)
8. Run test suite → Ensure still passing
9. Commit with message: "feat: [feature] with tests"

Repeat for next feature...

Evening:
10. Review code coverage report
11. Address any coverage gaps
12. Update implementation_status.md
13. Push changes
```

### Code Review Checklist

Before merging:
- [ ] All tests passing
- [ ] Coverage meets layer target
- [ ] No skipped tests without reason
- [ ] Test names describe behavior clearly
- [ ] No console.log or debugger statements
- [ ] Tests are independent (no order dependency)
- [ ] Mocks/stubs cleaned up after tests

---

## Continuous Integration

### Pre-commit Hooks

```bash
# .husky/pre-commit

#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

# Run tests
npm test

# Check coverage
npm run test:coverage

# Fail if coverage below threshold
```

### CI Pipeline

```yaml
# .github/workflows/test.yml

name: Test

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm test
      - run: npm run test:coverage
      - uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
```

---

## Measurement and Tracking

### Coverage Reports

```bash
# Generate coverage report
npm run test:coverage

# View HTML report
open coverage/lcov-report/index.html

# Coverage by layer
npm run test:coverage:by-layer
```

### Metrics to Track

| Metric | Target | Tool |
|--------|--------|------|
| Line Coverage | 90%+ | Jest |
| Branch Coverage | 85%+ | Jest |
| Function Coverage | 90%+ | Jest |
| Test Execution Time | < 30s | Jest |
| Mutation Score | 80%+ | Stryker |

---

## Test-Specific Documentation

### When to Write Different Test Types

**Unit Test**:
- Pure functions
- Business logic
- Domain models
- Isolated classes

**Integration Test**:
- Component interactions
- Database queries
- File I/O
- External API calls

**E2E Test**:
- Complete user workflows
- CLI commands
- Full system behavior

---

## Common Testing Challenges

### Challenge 1: Testing Async Code

```typescript
// Use async/await
it('should handle async operations', async () => {
  const result = await asyncFunction();
  expect(result).toBe('expected');
});

// Test promise rejection
it('should reject on error', async () => {
  await expect(asyncFunction()).rejects.toThrow('error message');
});
```

### Challenge 2: Testing Private Methods

```typescript
// DON'T test private methods directly
// Instead, test through public interface

it('should use private method internally', () => {
  const instance = new MyClass();
  // Call public method that uses private method
  const result = instance.publicMethod();
  // Assert on observable behavior
  expect(result).toBe('expected');
});
```

### Challenge 3: Testing File I/O

```typescript
// Use temporary directories
import { mkdtemp, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

let tempDir: string;

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), 'test-'));
});

afterEach(async () => {
  await rm(tempDir, { recursive: true, force: true });
});

it('should write file', async () => {
  const outputPath = join(tempDir, 'output.ox.test');
  await writeOxtestFile(outputPath, content);
  expect(fs.existsSync(outputPath)).toBe(true);
});
```

---

## Resources

### Jest Configuration

```javascript
// jest.config.js

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: ['**/*.test.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/*.interface.ts'
  ],
  coverageThresholds: {
    global: {
      branches: 85,
      functions: 90,
      lines: 90,
      statements: 90
    }
  },
  coverageReporters: ['text', 'lcov', 'html'],
  verbose: true
};
```

### Recommended Tools

- **Jest**: Test framework
- **ts-jest**: TypeScript support
- **@types/jest**: Type definitions
- **jest-extended**: Additional matchers
- **Stryker**: Mutation testing
- **Codecov**: Coverage tracking

---

## Summary

**Key Principles**:
1. ✅ Write test first (RED)
2. ✅ Write minimal code (GREEN)
3. ✅ Refactor mercilessly (REFACTOR)
4. ✅ 90%+ overall coverage
5. ✅ Fast, isolated, repeatable tests
6. ✅ Test behavior, not implementation

**Remember**: Tests are first-class code. Write them with the same care as production code.

---

**Next**: See [implementation/sprints/](./implementation/sprints/) for sprint-specific TDD tasks.
