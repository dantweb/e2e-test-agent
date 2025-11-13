# Sprint 7: Orchestration

**Duration**: 1 week (5 days)
**Status**: ⏸️ Not Started
**Dependencies**: Sprint 4 (Playwright), Sprint 6 (Decomposition)

## Goal

Implement sequential execution orchestrator that runs tasks and subtasks in order, maintains shared context, validates predicates, and handles errors.

## Tasks

### Day 1: Execution Context

#### Task 1: Shared Execution Context ⏸️

**TDD Approach**:
```typescript
// tests/unit/application/ExecutionContextManager.test.ts
describe('ExecutionContextManager', () => {
  let manager: ExecutionContextManager;

  beforeEach(() => {
    manager = new ExecutionContextManager();
  });

  it('should initialize empty context', () => {
    const context = manager.getContext();

    expect(context.variables).toEqual({});
    expect(context.cookies).toEqual([]);
    expect(context.sessionId).toBeDefined();
  });

  it('should set variable', () => {
    manager.setVariable('username', 'admin');
    const context = manager.getContext();

    expect(context.variables.username).toBe('admin');
  });

  it('should get variable', () => {
    manager.setVariable('url', 'https://shop.dev');
    const value = manager.getVariable('url');

    expect(value).toBe('https://shop.dev');
  });

  it('should update cookies', () => {
    const cookies = [
      { name: 'session', value: 'abc123', domain: '.shop.dev', path: '/' }
    ];

    manager.updateCookies(cookies);
    const context = manager.getContext();

    expect(context.cookies).toHaveLength(1);
    expect(context.cookies[0].name).toBe('session');
  });

  it('should clone context', () => {
    manager.setVariable('test', 'value');
    const clone = manager.clone();

    clone.setVariable('test', 'modified');

    expect(manager.getVariable('test')).toBe('value');
    expect(clone.getVariable('test')).toBe('modified');
  });

  it('should merge context', () => {
    manager.setVariable('a', '1');

    const other = new ExecutionContextManager();
    other.setVariable('b', '2');

    manager.merge(other.getContext());

    expect(manager.getVariable('a')).toBe('1');
    expect(manager.getVariable('b')).toBe('2');
  });
});
```

**Implementation** (src/application/orchestrators/ExecutionContextManager.ts):
```typescript
import { ExecutionContext, Cookie } from '../../domain/interfaces';

export class ExecutionContextManager {
  private context: ExecutionContext;

  constructor() {
    this.context = {
      variables: {},
      cookies: [],
      sessionId: this.generateSessionId()
    };
  }

  getContext(): ExecutionContext {
    return { ...this.context };
  }

  setVariable(key: string, value: string): void {
    this.context = {
      ...this.context,
      variables: {
        ...this.context.variables,
        [key]: value
      }
    };
  }

  getVariable(key: string): string | undefined {
    return this.context.variables[key];
  }

  updateCookies(cookies: ReadonlyArray<Cookie>): void {
    this.context = {
      ...this.context,
      cookies: [...cookies]
    };
  }

  clone(): ExecutionContextManager {
    const cloned = new ExecutionContextManager();
    cloned.context = {
      variables: { ...this.context.variables },
      cookies: [...this.context.cookies],
      sessionId: this.context.sessionId
    };
    return cloned;
  }

  merge(other: ExecutionContext): void {
    this.context = {
      variables: { ...this.context.variables, ...other.variables },
      cookies: [...this.context.cookies, ...other.cookies],
      sessionId: this.context.sessionId
    };
  }

  private generateSessionId(): string {
    return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
```

**Acceptance Criteria**:
- [ ] Initialize context
- [ ] Set/get variables
- [ ] Update cookies
- [ ] Clone context
- [ ] Merge contexts
- [ ] 100% test coverage

**Estimated Time**: 3 hours

---

### Day 2: Predicate Validator

#### Task 2: Predicate Validation Engine ⏸️

**TDD Approach**:
```typescript
// tests/unit/application/PredicateValidationEngine.test.ts
describe('PredicateValidationEngine', () => {
  let engine: PredicateValidationEngine;
  let mockExecutor: jest.Mocked<PlaywrightExecutor>;

  beforeEach(() => {
    mockExecutor = {
      execute: jest.fn(),
      getContext: jest.fn()
    } as any;

    engine = new PredicateValidationEngine(mockExecutor);
  });

  it('should validate exists predicate', async () => {
    mockExecutor.execute.mockResolvedValue({
      success: true,
      command: 'assert_exists',
      line: 0,
      output: 'Element exists'
    });

    const predicate: ValidationPredicate = {
      type: 'exists',
      selector: SelectorSpec.css('.success'),
      description: 'Success message exists'
    };

    const result = await engine.validate(predicate);

    expect(result.passed).toBe(true);
  });

  it('should validate not_exists predicate', async () => {
    mockExecutor.execute.mockResolvedValue({
      success: true,
      command: 'assert_not_exists',
      line: 0,
      output: 'Element does not exist'
    });

    const predicate: ValidationPredicate = {
      type: 'not_exists',
      selector: SelectorSpec.css('.error'),
      description: 'Error does not exist'
    };

    const result = await engine.validate(predicate);

    expect(result.passed).toBe(true);
  });

  it('should validate url predicate', async () => {
    mockExecutor.execute.mockResolvedValue({
      success: true,
      command: 'assert_url',
      line: 0,
      output: 'URL matches'
    });

    const predicate: ValidationPredicate = {
      type: 'url',
      expected: '.*/home',
      description: 'URL contains /home'
    };

    const result = await engine.validate(predicate);

    expect(result.passed).toBe(true);
  });

  it('should fail validation on error', async () => {
    mockExecutor.execute.mockResolvedValue({
      success: false,
      command: 'assert_exists',
      line: 0,
      error: 'Element not found'
    });

    const predicate: ValidationPredicate = {
      type: 'exists',
      selector: SelectorSpec.css('.missing'),
      description: 'Missing element'
    };

    const result = await engine.validate(predicate);

    expect(result.passed).toBe(false);
    expect(result.error).toContain('not found');
  });

  it('should validate all predicates', async () => {
    mockExecutor.execute.mockResolvedValue({
      success: true,
      command: 'assert',
      line: 0
    });

    const predicates: ValidationPredicate[] = [
      { type: 'exists', selector: SelectorSpec.css('.a'), description: 'A' },
      { type: 'exists', selector: SelectorSpec.css('.b'), description: 'B' },
      { type: 'url', expected: '/page', description: 'URL' }
    ];

    const results = await engine.validateAll(predicates);

    expect(results).toHaveLength(3);
    expect(results.every(r => r.passed)).toBe(true);
  });
});
```

**Implementation** (src/application/orchestrators/PredicateValidationEngine.ts):
```typescript
import { ValidationPredicate } from '../../domain/interfaces';
import { PlaywrightExecutor } from '../../infrastructure/executors/PlaywrightExecutor';
import { OxtestCommand } from '../../domain/models/OxtestCommand';

export interface ValidationResult {
  predicate: ValidationPredicate;
  passed: boolean;
  error?: string;
}

export class PredicateValidationEngine {
  constructor(private readonly executor: PlaywrightExecutor) {}

  async validate(predicate: ValidationPredicate): Promise<ValidationResult> {
    try {
      const command = this.buildCommand(predicate);
      const result = await this.executor.execute(command);

      return {
        predicate,
        passed: result.success,
        error: result.error
      };
    } catch (error) {
      return {
        predicate,
        passed: false,
        error: (error as Error).message
      };
    }
  }

  async validateAll(
    predicates: ReadonlyArray<ValidationPredicate>
  ): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];

    for (const predicate of predicates) {
      const result = await this.validate(predicate);
      results.push(result);
    }

    return results;
  }

  private buildCommand(predicate: ValidationPredicate): OxtestCommand {
    switch (predicate.type) {
      case 'exists':
        return new OxtestCommand(0, 'assert_exists', predicate.selector, {});

      case 'not_exists':
        return new OxtestCommand(0, 'assert_not_exists', predicate.selector, {});

      case 'visible':
        return new OxtestCommand(0, 'assert_visible', predicate.selector, {
          value: predicate.expected || ''
        });

      case 'text':
        return new OxtestCommand(0, 'assert_text', predicate.selector, {
          value: predicate.expected || ''
        });

      case 'value':
        return new OxtestCommand(0, 'assert_value', predicate.selector, {
          value: predicate.expected || ''
        });

      case 'url':
        return new OxtestCommand(0, 'assert_url', undefined, {
          pattern: predicate.expected || ''
        });

      default:
        throw new Error(`Unknown predicate type: ${predicate.type}`);
    }
  }
}
```

**Acceptance Criteria**:
- [ ] Validate all predicate types
- [ ] Handle success/failure
- [ ] Validate multiple predicates
- [ ] Clear error messages
- [ ] 100% test coverage

**Estimated Time**: 4 hours

---

### Day 3-4: Sequential Orchestrator

#### Task 3: Sequential Execution Orchestrator ⏸️

**TDD Approach**:
```typescript
// tests/unit/application/SequentialExecutionOrchestrator.test.ts
describe('SequentialExecutionOrchestrator', () => {
  let orchestrator: SequentialExecutionOrchestrator;
  let mockExecutor: jest.Mocked<PlaywrightExecutor>;
  let mockValidator: jest.Mocked<PredicateValidationEngine>;
  let mockContextManager: ExecutionContextManager;

  beforeEach(() => {
    mockExecutor = {
      execute: jest.fn(),
      initialize: jest.fn(),
      close: jest.fn()
    } as any;

    mockValidator = {
      validateAll: jest.fn()
    } as any;

    mockContextManager = new ExecutionContextManager();

    orchestrator = new SequentialExecutionOrchestrator(
      mockExecutor,
      mockValidator,
      mockContextManager
    );
  });

  it('should execute single subtask', async () => {
    const subtask = Subtask.create('sub-1', 'Navigate', [
      OxtestCommand.navigate('https://shop.dev', 1)
    ]);

    mockExecutor.execute.mockResolvedValue({
      success: true,
      command: 'navigate',
      line: 1
    });

    const result = await orchestrator.executeSubtask(subtask);

    expect(result.status).toBe(TaskStatus.COMPLETED);
  });

  it('should execute multiple commands in order', async () => {
    const commands = [
      OxtestCommand.navigate('https://shop.dev', 1),
      OxtestCommand.click(SelectorSpec.css('button'), 2),
      OxtestCommand.wait(1000, 3)
    ];

    const subtask = Subtask.create('sub-1', 'Test', commands);

    mockExecutor.execute.mockResolvedValue({ success: true, command: 'test', line: 0 });

    await orchestrator.executeSubtask(subtask);

    expect(mockExecutor.execute).toHaveBeenCalledTimes(3);
    expect(mockExecutor.execute).toHaveBeenNthCalledWith(1, commands[0]);
    expect(mockExecutor.execute).toHaveBeenNthCalledWith(2, commands[1]);
    expect(mockExecutor.execute).toHaveBeenNthCalledWith(3, commands[2]);
  });

  it('should fail subtask on command error', async () => {
    const subtask = Subtask.create('sub-1', 'Test', [
      OxtestCommand.click(SelectorSpec.css('.missing'), 1)
    ]);

    mockExecutor.execute.mockResolvedValue({
      success: false,
      command: 'click',
      line: 1,
      error: 'Element not found'
    });

    const result = await orchestrator.executeSubtask(subtask);

    expect(result.status).toBe(TaskStatus.FAILED);
    expect(result.error).toContain('not found');
  });

  it('should execute complete task', async () => {
    let task = Task.create('task-1', 'Login Test');
    const sub1 = Subtask.create('sub-1', 'Nav', [
      OxtestCommand.navigate('https://shop.dev', 1)
    ]);
    const sub2 = Subtask.create('sub-2', 'Click', [
      OxtestCommand.click(SelectorSpec.css('button'), 2)
    ]);

    task = task.addSubtask(sub1).addSubtask(sub2);

    mockExecutor.execute.mockResolvedValue({ success: true, command: 'test', line: 0 });

    const result = await orchestrator.executeTask(task);

    expect(result.status).toBe(TaskStatus.COMPLETED);
    expect(mockExecutor.execute).toHaveBeenCalledTimes(2);
  });

  it('should validate predicates after execution', async () => {
    let task = Task.create('task-1', 'Test');
    const subtask = Subtask.create('sub-1', 'Nav', [
      OxtestCommand.navigate('https://shop.dev', 1)
    ]);

    task = task.addSubtask(subtask).addValidation({
      type: 'url',
      expected: '.*/shop',
      description: 'URL check'
    });

    mockExecutor.execute.mockResolvedValue({ success: true, command: 'test', line: 0 });
    mockValidator.validateAll.mockResolvedValue([
      { predicate: task.validations[0], passed: true }
    ]);

    const result = await orchestrator.executeTask(task);

    expect(result.status).toBe(TaskStatus.COMPLETED);
    expect(mockValidator.validateAll).toHaveBeenCalled();
  });

  it('should fail task on validation failure', async () => {
    let task = Task.create('task-1', 'Test');
    const subtask = Subtask.create('sub-1', 'Nav', [
      OxtestCommand.navigate('https://shop.dev', 1)
    ]);

    task = task.addSubtask(subtask).addValidation({
      type: 'exists',
      selector: SelectorSpec.css('.success'),
      description: 'Success check'
    });

    mockExecutor.execute.mockResolvedValue({ success: true, command: 'test', line: 0 });
    mockValidator.validateAll.mockResolvedValue([
      {
        predicate: task.validations[0],
        passed: false,
        error: 'Element not found'
      }
    ]);

    const result = await orchestrator.executeTask(task);

    expect(result.status).toBe(TaskStatus.FAILED);
  });
});
```

**Implementation** (src/application/orchestrators/SequentialExecutionOrchestrator.ts):
```typescript
import { Task } from '../../domain/entities/Task';
import { Subtask } from '../../domain/entities/Subtask';
import { TaskStatus } from '../../domain/enums';
import { PlaywrightExecutor } from '../../infrastructure/executors/PlaywrightExecutor';
import { PredicateValidationEngine } from './PredicateValidationEngine';
import { ExecutionContextManager } from './ExecutionContextManager';

export class SequentialExecutionOrchestrator {
  constructor(
    private readonly executor: PlaywrightExecutor,
    private readonly validator: PredicateValidationEngine,
    private readonly contextManager: ExecutionContextManager
  ) {}

  async executeTask(task: Task): Promise<Task> {
    let currentTask = task.markAsRunning();

    // Execute subtasks sequentially
    for (const subtask of currentTask.subtasks) {
      const result = await this.executeSubtask(subtask);

      if (result.status === TaskStatus.FAILED) {
        return currentTask.markAsFailed(result.error || 'Subtask failed');
      }
    }

    // Validate predicates
    if (currentTask.validations.length > 0) {
      const validationResults = await this.validator.validateAll(currentTask.validations);

      const failedValidation = validationResults.find(r => !r.passed);
      if (failedValidation) {
        return currentTask.markAsFailed(
          `Validation failed: ${failedValidation.predicate.description}`
        );
      }
    }

    return currentTask.markAsCompleted();
  }

  async executeSubtask(subtask: Subtask): Promise<Subtask> {
    let current = subtask.markAsRunning();

    for (const command of current.commands) {
      try {
        const result = await this.executor.execute(command);

        if (!result.success) {
          return current.markAsFailed(
            result.error || `Command failed: ${command.command}`
          );
        }

        // Update context if needed
        this.updateContext(command, result);
      } catch (error) {
        return current.markAsFailed((error as Error).message);
      }
    }

    return current.markAsCompleted();
  }

  private updateContext(command: OxtestCommand, result: ExecutionResult): void {
    // Extract variables from command execution
    // For example, if a command sets a value, store it
    if (command.command === 'navigate') {
      this.contextManager.setVariable('currentUrl', command.params.url);
    }
  }

  getContext(): ExecutionContext {
    return this.contextManager.getContext();
  }
}
```

**Acceptance Criteria**:
- [ ] Execute subtasks sequentially
- [ ] Execute complete tasks
- [ ] Validate predicates
- [ ] Update context
- [ ] Handle errors
- [ ] 90% test coverage

**Estimated Time**: 8 hours

---

### Day 5: Integration Tests

#### Task 4: Orchestration Integration Tests ⏸️

**TDD Approach**:
```typescript
// tests/integration/application/OrchestrationFlow.test.ts
describe('Orchestration Flow Integration', () => {
  it('should execute complete end-to-end flow', async () => {
    // Full integration: decompose + execute + validate
    const test: Test = {
      name: 'Login Test',
      steps: [
        { action: 'navigate', prompt: 'Go to https://example.com/login' },
        { action: 'type', prompt: 'Enter username "admin"' },
        { action: 'click', prompt: 'Click login button' }
      ],
      validation: {
        url_contains: '/home',
        element_exists: '.user-menu'
      }
    };

    // Setup
    const executor = new PlaywrightExecutor();
    await executor.initialize();

    const contextManager = new ExecutionContextManager();
    const validator = new PredicateValidationEngine(executor);
    const orchestrator = new SequentialExecutionOrchestrator(
      executor,
      validator,
      contextManager
    );

    // Create simple task (no LLM decomposition for this test)
    let task = Task.create('test-1', test.name);
    const subtask = Subtask.create('sub-1', 'Login flow', [
      OxtestCommand.navigate('https://example.com/login', 1),
      OxtestCommand.type(
        SelectorSpec.css('input[name="username"]'),
        'admin',
        2
      ),
      OxtestCommand.click(SelectorSpec.css('button[type="submit"]'), 3)
    ]);

    task = task.addSubtask(subtask);

    // Execute
    const result = await orchestrator.executeTask(task);

    // Verify
    expect(result.status).toBe(TaskStatus.COMPLETED);

    await executor.close();
  }, 30000);
});
```

**Acceptance Criteria**:
- [ ] End-to-end orchestration
- [ ] Real browser execution
- [ ] Validation working
- [ ] Application layer 90%+ coverage

**Estimated Time**: 3 hours

---

## Checklist

- [ ] Task 1: Execution context manager
- [ ] Task 2: Predicate validation engine
- [ ] Task 3: Sequential orchestrator
- [ ] Task 4: Integration tests

## Definition of Done

- ✅ All orchestration components implemented
- ✅ Sequential execution working
- ✅ Context management working
- ✅ Validation working
- ✅ 90%+ test coverage
- ✅ All tests passing
- ✅ Error handling comprehensive
- ✅ JSDoc comments complete
- ✅ Code reviewed

## Next Sprint

[Sprint 8: CLI & Reports](./sprint-8-cli-reports.md)

---

**Last Updated**: November 13, 2025
