# Sprint 1: Domain Layer

**Duration**: 1 week (5 days)
**Status**: ⏸️ Not Started
**Dependencies**: Sprint 0 (Setup)

## Goal

Implement core domain models and interfaces following TDD principles. Achieve 95%+ test coverage for all domain components.

## Tasks

### Day 1: Core Value Objects

#### Task 1: SelectorSpec Value Object ⏸️

**TDD Approach**:
```typescript
// tests/unit/domain/SelectorSpec.test.ts
describe('SelectorSpec', () => {
  it('should create css selector', () => {
    const spec = SelectorSpec.css('button.submit');
    expect(spec.strategy).toBe('css');
    expect(spec.value).toBe('button.submit');
  });

  it('should create text selector with fallback', () => {
    const spec = SelectorSpec.text('Login')
      .withFallback(SelectorSpec.css('button[type="submit"]'));
    expect(spec.strategy).toBe('text');
    expect(spec.fallback).toBeDefined();
  });

  it('should validate selector strategy', () => {
    expect(() => SelectorSpec.create('invalid', 'value'))
      .toThrow('Invalid selector strategy');
  });
});
```

**Implementation** (src/domain/models/SelectorSpec.ts):
```typescript
export type SelectorStrategy = 'css' | 'xpath' | 'text' | 'placeholder' | 'label' | 'role' | 'testid';

export class SelectorSpec {
  private constructor(
    public readonly strategy: SelectorStrategy,
    public readonly value: string,
    public readonly fallback?: SelectorSpec
  ) {}

  static css(value: string): SelectorSpec {
    return new SelectorSpec('css', value);
  }

  static text(value: string): SelectorSpec {
    return new SelectorSpec('text', value);
  }

  static xpath(value: string): SelectorSpec {
    return new SelectorSpec('xpath', value);
  }

  withFallback(fallback: SelectorSpec): SelectorSpec {
    return new SelectorSpec(this.strategy, this.value, fallback);
  }

  toString(): string {
    let result = `${this.strategy}=${this.value}`;
    if (this.fallback) {
      result += ` fallback=${this.fallback.toString()}`;
    }
    return result;
  }
}
```

**Acceptance Criteria**:
- [ ] All selector strategies supported
- [ ] Fallback chain works
- [ ] Immutable value object
- [ ] 100% test coverage
- [ ] toString() produces valid oxtest syntax

**Estimated Time**: 3 hours

---

#### Task 2: OxtestCommand Value Object ⏸️

**TDD Approach**:
```typescript
// tests/unit/domain/OxtestCommand.test.ts
describe('OxtestCommand', () => {
  it('should create navigate command', () => {
    const cmd = OxtestCommand.navigate('https://example.com', 1);
    expect(cmd.command).toBe('navigate');
    expect(cmd.params.url).toBe('https://example.com');
    expect(cmd.line).toBe(1);
  });

  it('should create click command with selector', () => {
    const selector = SelectorSpec.css('button.submit');
    const cmd = OxtestCommand.click(selector, 2);
    expect(cmd.command).toBe('click');
    expect(cmd.selector).toBe(selector);
  });

  it('should create type command with value', () => {
    const selector = SelectorSpec.css('input[name="username"]');
    const cmd = OxtestCommand.type(selector, 'testuser', 3);
    expect(cmd.params.value).toBe('testuser');
  });

  it('should validate required params', () => {
    expect(() => OxtestCommand.navigate('', 1))
      .toThrow('URL is required');
  });
});
```

**Implementation** (src/domain/models/OxtestCommand.ts):
```typescript
export type CommandType =
  | 'navigate' | 'click' | 'type' | 'hover' | 'keypress'
  | 'wait' | 'wait_navigation' | 'wait_for'
  | 'assert_exists' | 'assert_not_exists' | 'assert_visible'
  | 'assert_text' | 'assert_value' | 'assert_url';

export class OxtestCommand {
  private constructor(
    public readonly line: number,
    public readonly command: CommandType,
    public readonly selector: SelectorSpec | undefined,
    public readonly params: Readonly<Record<string, string>>
  ) {}

  static navigate(url: string, line: number): OxtestCommand {
    if (!url) throw new Error('URL is required');
    return new OxtestCommand(line, 'navigate', undefined, { url });
  }

  static click(selector: SelectorSpec, line: number, timeout?: number): OxtestCommand {
    const params: Record<string, string> = {};
    if (timeout) params.timeout = timeout.toString();
    return new OxtestCommand(line, 'click', selector, params);
  }

  static type(selector: SelectorSpec, value: string, line: number): OxtestCommand {
    if (!value) throw new Error('Value is required');
    return new OxtestCommand(line, 'type', selector, { value });
  }

  // ... more factory methods
}
```

**Acceptance Criteria**:
- [ ] All command types supported
- [ ] Immutable value object
- [ ] Factory methods for each command type
- [ ] Parameter validation
- [ ] 100% test coverage

**Estimated Time**: 4 hours

---

### Day 2: Enums and Interfaces

#### Task 3: Enums (ActionType, TaskStatus) ⏸️

**TDD Approach**:
```typescript
// tests/unit/domain/enums.test.ts
describe('ActionType', () => {
  it('should have all action types', () => {
    expect(ActionType.NAVIGATE).toBe('navigate');
    expect(ActionType.CLICK).toBe('click');
    expect(ActionType.TYPE).toBe('type');
  });

  it('should validate action type', () => {
    expect(ActionType.isValid('navigate')).toBe(true);
    expect(ActionType.isValid('invalid')).toBe(false);
  });
});

describe('TaskStatus', () => {
  it('should have all statuses', () => {
    expect(TaskStatus.PENDING).toBe('pending');
    expect(TaskStatus.RUNNING).toBe('running');
    expect(TaskStatus.COMPLETED).toBe('completed');
    expect(TaskStatus.FAILED).toBe('failed');
  });

  it('should check if terminal state', () => {
    expect(TaskStatus.isTerminal(TaskStatus.COMPLETED)).toBe(true);
    expect(TaskStatus.isTerminal(TaskStatus.RUNNING)).toBe(false);
  });
});
```

**Implementation** (src/domain/enums/index.ts):
```typescript
export enum ActionType {
  NAVIGATE = 'navigate',
  CLICK = 'click',
  TYPE = 'type',
  HOVER = 'hover',
  KEYPRESS = 'keypress',
  WAIT = 'wait',
  ASSERT = 'assert'
}

export namespace ActionType {
  export function isValid(value: string): boolean {
    return Object.values(ActionType).includes(value as ActionType);
  }
}

export enum TaskStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  SKIPPED = 'skipped'
}

export namespace TaskStatus {
  export function isTerminal(status: TaskStatus): boolean {
    return [TaskStatus.COMPLETED, TaskStatus.FAILED, TaskStatus.SKIPPED]
      .includes(status);
  }
}
```

**Acceptance Criteria**:
- [ ] All enum values defined
- [ ] Helper functions (isValid, isTerminal)
- [ ] 100% test coverage

**Estimated Time**: 2 hours

---

#### Task 4: Domain Interfaces ⏸️

**TDD Approach**:
```typescript
// tests/unit/domain/interfaces.test.ts
describe('Domain Interfaces', () => {
  it('should create valid Task', () => {
    const task: Task = {
      id: 'task-1',
      description: 'Login to shop',
      status: TaskStatus.PENDING,
      subtasks: [],
      validations: []
    };
    expect(task.id).toBe('task-1');
  });

  it('should create Subtask with commands', () => {
    const subtask: Subtask = {
      id: 'subtask-1',
      description: 'Navigate to login',
      commands: [
        OxtestCommand.navigate('https://example.com', 1)
      ],
      status: TaskStatus.PENDING
    };
    expect(subtask.commands).toHaveLength(1);
  });

  it('should create ValidationPredicate', () => {
    const predicate: ValidationPredicate = {
      type: 'exists',
      selector: SelectorSpec.css('.success'),
      description: 'Success message shown'
    };
    expect(predicate.type).toBe('exists');
  });
});
```

**Implementation** (src/domain/interfaces/index.ts):
```typescript
import { TaskStatus } from '../enums';
import { OxtestCommand } from '../models/OxtestCommand';
import { SelectorSpec } from '../models/SelectorSpec';

export interface Task {
  readonly id: string;
  readonly description: string;
  readonly status: TaskStatus;
  readonly subtasks: ReadonlyArray<Subtask>;
  readonly validations: ReadonlyArray<ValidationPredicate>;
  readonly dependencies?: ReadonlyArray<string>; // Task IDs
  readonly error?: string;
}

export interface Subtask {
  readonly id: string;
  readonly description: string;
  readonly commands: ReadonlyArray<OxtestCommand>;
  readonly status: TaskStatus;
  readonly error?: string;
}

export interface ValidationPredicate {
  readonly type: 'exists' | 'not_exists' | 'visible' | 'text' | 'value' | 'url';
  readonly selector?: SelectorSpec;
  readonly expected?: string;
  readonly description: string;
}

export interface ExecutionContext {
  readonly variables: Readonly<Record<string, string>>;
  readonly cookies: ReadonlyArray<Cookie>;
  readonly sessionId: string;
}

export interface Cookie {
  readonly name: string;
  readonly value: string;
  readonly domain: string;
  readonly path: string;
}
```

**Acceptance Criteria**:
- [ ] All interfaces defined with readonly properties
- [ ] Complete JSDoc comments
- [ ] Type-safe relationships
- [ ] Test coverage for interface usage

**Estimated Time**: 2 hours

---

### Day 3: Task Entity

#### Task 5: Task Entity with Business Logic ⏸️

**TDD Approach**:
```typescript
// tests/unit/domain/Task.test.ts
describe('Task', () => {
  it('should create pending task', () => {
    const task = Task.create('task-1', 'Login to shop');
    expect(task.status).toBe(TaskStatus.PENDING);
    expect(task.subtasks).toHaveLength(0);
  });

  it('should add subtask', () => {
    const task = Task.create('task-1', 'Login');
    const subtask = Subtask.create('sub-1', 'Navigate', []);
    const updated = task.addSubtask(subtask);

    expect(updated.subtasks).toHaveLength(1);
    expect(task.subtasks).toHaveLength(0); // immutable
  });

  it('should mark as running', () => {
    const task = Task.create('task-1', 'Login');
    const running = task.markAsRunning();

    expect(running.status).toBe(TaskStatus.RUNNING);
  });

  it('should mark as completed when all subtasks done', () => {
    let task = Task.create('task-1', 'Login');
    const sub = Subtask.create('sub-1', 'Nav', []).markAsCompleted();
    task = task.addSubtask(sub);

    const completed = task.checkCompletion();
    expect(completed.status).toBe(TaskStatus.COMPLETED);
  });

  it('should mark as failed if any subtask failed', () => {
    let task = Task.create('task-1', 'Login');
    const sub = Subtask.create('sub-1', 'Nav', []).markAsFailed('Error');
    task = task.addSubtask(sub);

    const failed = task.checkCompletion();
    expect(failed.status).toBe(TaskStatus.FAILED);
  });

  it('should add validation predicate', () => {
    const task = Task.create('task-1', 'Login');
    const predicate: ValidationPredicate = {
      type: 'exists',
      selector: SelectorSpec.css('.success'),
      description: 'Success shown'
    };

    const updated = task.addValidation(predicate);
    expect(updated.validations).toHaveLength(1);
  });
});
```

**Implementation** (src/domain/entities/Task.ts):
```typescript
import { TaskStatus } from '../enums';
import { Subtask } from './Subtask';
import { ValidationPredicate } from '../interfaces';

export class Task {
  private constructor(
    public readonly id: string,
    public readonly description: string,
    public readonly status: TaskStatus,
    public readonly subtasks: ReadonlyArray<Subtask>,
    public readonly validations: ReadonlyArray<ValidationPredicate>,
    public readonly dependencies: ReadonlyArray<string>,
    public readonly error?: string
  ) {}

  static create(id: string, description: string): Task {
    return new Task(id, description, TaskStatus.PENDING, [], [], []);
  }

  addSubtask(subtask: Subtask): Task {
    return new Task(
      this.id,
      this.description,
      this.status,
      [...this.subtasks, subtask],
      this.validations,
      this.dependencies,
      this.error
    );
  }

  addValidation(predicate: ValidationPredicate): Task {
    return new Task(
      this.id,
      this.description,
      this.status,
      this.subtasks,
      [...this.validations, predicate],
      this.dependencies,
      this.error
    );
  }

  markAsRunning(): Task {
    return new Task(
      this.id,
      this.description,
      TaskStatus.RUNNING,
      this.subtasks,
      this.validations,
      this.dependencies
    );
  }

  markAsCompleted(): Task {
    return new Task(
      this.id,
      this.description,
      TaskStatus.COMPLETED,
      this.subtasks,
      this.validations,
      this.dependencies
    );
  }

  markAsFailed(error: string): Task {
    return new Task(
      this.id,
      this.description,
      TaskStatus.FAILED,
      this.subtasks,
      this.validations,
      this.dependencies,
      error
    );
  }

  checkCompletion(): Task {
    const allCompleted = this.subtasks.every(s => s.status === TaskStatus.COMPLETED);
    const anyFailed = this.subtasks.some(s => s.status === TaskStatus.FAILED);

    if (anyFailed) {
      const failedSubtask = this.subtasks.find(s => s.status === TaskStatus.FAILED);
      return this.markAsFailed(failedSubtask?.error || 'Subtask failed');
    }

    if (allCompleted && this.subtasks.length > 0) {
      return this.markAsCompleted();
    }

    return this;
  }
}
```

**Acceptance Criteria**:
- [ ] Immutable entity
- [ ] Business logic methods
- [ ] Status transitions
- [ ] Completion checking
- [ ] 100% test coverage

**Estimated Time**: 4 hours

---

### Day 4: Subtask Entity

#### Task 6: Subtask Entity ⏸️

**TDD Approach**:
```typescript
// tests/unit/domain/Subtask.test.ts
describe('Subtask', () => {
  const cmd = OxtestCommand.navigate('https://example.com', 1);

  it('should create pending subtask', () => {
    const subtask = Subtask.create('sub-1', 'Navigate', [cmd]);
    expect(subtask.status).toBe(TaskStatus.PENDING);
    expect(subtask.commands).toHaveLength(1);
  });

  it('should mark as running', () => {
    const subtask = Subtask.create('sub-1', 'Nav', [cmd]);
    const running = subtask.markAsRunning();
    expect(running.status).toBe(TaskStatus.RUNNING);
  });

  it('should mark as completed', () => {
    const subtask = Subtask.create('sub-1', 'Nav', [cmd]);
    const completed = subtask.markAsCompleted();
    expect(completed.status).toBe(TaskStatus.COMPLETED);
  });

  it('should mark as failed with error', () => {
    const subtask = Subtask.create('sub-1', 'Nav', [cmd]);
    const failed = subtask.markAsFailed('Navigation timeout');

    expect(failed.status).toBe(TaskStatus.FAILED);
    expect(failed.error).toBe('Navigation timeout');
  });

  it('should be immutable', () => {
    const subtask = Subtask.create('sub-1', 'Nav', [cmd]);
    const updated = subtask.markAsCompleted();

    expect(subtask.status).toBe(TaskStatus.PENDING);
    expect(updated.status).toBe(TaskStatus.COMPLETED);
  });
});
```

**Implementation** (src/domain/entities/Subtask.ts):
```typescript
import { TaskStatus } from '../enums';
import { OxtestCommand } from '../models/OxtestCommand';

export class Subtask {
  private constructor(
    public readonly id: string,
    public readonly description: string,
    public readonly commands: ReadonlyArray<OxtestCommand>,
    public readonly status: TaskStatus,
    public readonly error?: string
  ) {}

  static create(
    id: string,
    description: string,
    commands: ReadonlyArray<OxtestCommand>
  ): Subtask {
    return new Subtask(id, description, commands, TaskStatus.PENDING);
  }

  markAsRunning(): Subtask {
    return new Subtask(
      this.id,
      this.description,
      this.commands,
      TaskStatus.RUNNING
    );
  }

  markAsCompleted(): Subtask {
    return new Subtask(
      this.id,
      this.description,
      this.commands,
      TaskStatus.COMPLETED
    );
  }

  markAsFailed(error: string): Subtask {
    return new Subtask(
      this.id,
      this.description,
      this.commands,
      TaskStatus.FAILED,
      error
    );
  }
}
```

**Acceptance Criteria**:
- [ ] Immutable entity
- [ ] Status transitions
- [ ] Error handling
- [ ] 100% test coverage

**Estimated Time**: 3 hours

---

### Day 5: Integration and Polish

#### Task 7: Domain Layer Integration Tests ⏸️

**TDD Approach**:
```typescript
// tests/integration/domain/TaskWorkflow.test.ts
describe('Task Workflow Integration', () => {
  it('should execute complete task lifecycle', () => {
    // Create task
    let task = Task.create('task-1', 'Login to shop');

    // Add validation
    const validation: ValidationPredicate = {
      type: 'url',
      expected: '.*/home',
      description: 'Navigate to home'
    };
    task = task.addValidation(validation);

    // Add subtasks
    const nav = Subtask.create('sub-1', 'Navigate', [
      OxtestCommand.navigate('https://shop.dev', 1)
    ]);
    const login = Subtask.create('sub-2', 'Login', [
      OxtestCommand.type(SelectorSpec.css('input[name="user"]'), 'admin', 2),
      OxtestCommand.click(SelectorSpec.text('Login'), 3)
    ]);

    task = task.addSubtask(nav).addSubtask(login);

    // Execute
    task = task.markAsRunning();
    expect(task.status).toBe(TaskStatus.RUNNING);

    // Complete subtasks
    const completedNav = nav.markAsCompleted();
    const completedLogin = login.markAsCompleted();

    task = new Task(
      task.id,
      task.description,
      task.status,
      [completedNav, completedLogin],
      task.validations,
      task.dependencies
    );

    // Check completion
    task = task.checkCompletion();
    expect(task.status).toBe(TaskStatus.COMPLETED);
  });
});
```

**Acceptance Criteria**:
- [ ] Full lifecycle tests
- [ ] Error scenario tests
- [ ] Edge case coverage
- [ ] Domain layer 95%+ coverage

**Estimated Time**: 4 hours

---

## Checklist

- [ ] Task 1: SelectorSpec value object
- [ ] Task 2: OxtestCommand value object
- [ ] Task 3: Enums (ActionType, TaskStatus)
- [ ] Task 4: Domain interfaces
- [ ] Task 5: Task entity
- [ ] Task 6: Subtask entity
- [ ] Task 7: Integration tests

## Definition of Done

- ✅ All domain models implemented
- ✅ 95%+ test coverage
- ✅ All tests passing
- ✅ TypeScript strict mode (no `any`)
- ✅ Immutable entities
- ✅ JSDoc comments complete
- ✅ Integration tests pass
- ✅ Code reviewed

## Next Sprint

[Sprint 2: Configuration Layer](./sprint-2-configuration.md)

---

**Last Updated**: November 13, 2025
