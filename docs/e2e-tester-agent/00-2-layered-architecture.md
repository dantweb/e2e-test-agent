# e2e-tester-agent: Layered Architecture

**Version**: 1.0
**Date**: November 13, 2025

## Architectural Overview

The system follows **Clean Architecture** principles with clear separation between layers. Dependencies flow inward: outer layers depend on inner abstractions, never the reverse.

```
┌─────────────────────────────────────────────────────┐
│  Layer 5: Output/Presentation (CLI, Reports)       │
├─────────────────────────────────────────────────────┤
│  Layer 4: Infrastructure (Playwright, LLM APIs)    │
├─────────────────────────────────────────────────────┤
│  Layer 3: Application (Orchestration, Execution)   │
├─────────────────────────────────────────────────────┤
│  Layer 2: Domain (Task Models, Validation Logic)   │
├─────────────────────────────────────────────────────┤
│  Layer 1: Configuration (YAML Parsing)             │
└─────────────────────────────────────────────────────┘
```

## Layer 1: Configuration Layer

**Responsibility**: Parse and validate YAML test specifications

**Key Components**:

### YamlConfigParser
```typescript
interface IConfigParser {
  parse(filePath: string): Promise<TestConfiguration>;
  validate(config: TestConfiguration): ValidationResult;
}

class YamlConfigParser implements IConfigParser {
  constructor(
    private readonly schemaValidator: ISchemaValidator,
    private readonly envResolver: IEnvironmentResolver
  ) {}

  async parse(filePath: string): Promise<TestConfiguration> {
    // Load YAML file
    // Validate against schema
    // Resolve environment variables
    // Return typed configuration
  }
}
```

### Types
```typescript
interface TestConfiguration {
  readonly name: string;
  readonly environment: Environment;
  readonly url: string;
  readonly timeout: number;
  readonly jobs: ReadonlyArray<JobDefinition>;
}

interface JobDefinition {
  readonly name: string;
  readonly prompt: string | ComplexPrompt;
  readonly acceptance: ReadonlyArray<string | AcceptanceCriteria>;
  readonly onError?: ErrorStrategy;
}

interface ComplexPrompt {
  readonly promptStr: string;
  readonly expectedActions?: ReadonlyArray<string>;
  readonly expectedActionSequence?: ReadonlyArray<string>;
}

interface ErrorStrategy {
  readonly try: string;
  readonly catch: string;
}
```

**Dependencies**: None (pure TypeScript, no external frameworks)

**Testing Strategy**:
- Unit tests for YAML parsing
- Schema validation tests
- Environment variable resolution tests
- Error handling for malformed YAML

---

## Layer 2: Domain Layer

**Responsibility**: Core business logic, task models, validation predicates

**Key Components**:

### Task and Subtask Models

```typescript
enum TaskStatus {
  Pending = 'pending',
  InProgress = 'in_progress',
  Completed = 'completed',
  Failed = 'failed',
  Blocked = 'blocked'
}

enum ActionType {
  Navigate = 'navigate',
  Click = 'click',
  Type = 'type',
  Select = 'select',
  Wait = 'wait',
  Assert = 'assert',
  Screenshot = 'screenshot'
}

interface Task {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly subtasks: ReadonlyArray<Subtask>;
  readonly metadata: TaskMetadata;

  isComplete(): boolean;
  hasFailures(): boolean;
}

interface Subtask {
  readonly id: number;
  readonly title: string;
  readonly prompt: string;
  readonly action: ActionType;
  readonly selector?: ElementSelector;
  readonly value?: string;
  readonly dependencies: ReadonlyArray<number>;
  readonly acceptance: ReadonlyArray<ValidationPredicate>;
  status: TaskStatus;
  result?: ExecutionResult;

  canExecute(completedTasks: Set<number>): boolean;
  markComplete(result: ExecutionResult): void;
  markFailed(error: Error): void;
}

interface ElementSelector {
  readonly css?: string;
  readonly xpath?: string;
  readonly text?: string;
  readonly role?: string;
  readonly testId?: string;
}
```

### Validation Predicates

```typescript
enum ValidationType {
  DomExists = 'dom_exists',
  TextContains = 'text_contains',
  UrlMatches = 'url_matches',
  CountEquals = 'count_equals',
  DatabaseWatch = 'db_watch',
  CustomLLM = 'custom_llm'
}

interface ValidationPredicate {
  readonly type: ValidationType;
  readonly criteria: string;
  readonly params: Record<string, unknown>;

  evaluate(result: ExecutionResult): Promise<ValidationResult>;
}

class DomExistsValidation implements ValidationPredicate {
  readonly type = ValidationType.DomExists;

  constructor(
    readonly criteria: string,
    readonly params: { selector: string; visible?: boolean }
  ) {}

  async evaluate(result: ExecutionResult): Promise<ValidationResult> {
    // Check if element exists in DOM
  }
}

class TextContainsValidation implements ValidationPredicate {
  readonly type = ValidationType.TextContains;

  constructor(
    readonly criteria: string,
    readonly params: { selector: string; text: string }
  ) {}

  async evaluate(result: ExecutionResult): Promise<ValidationResult> {
    // Check if element contains text
  }
}
```

### Task Graph (DAG)

```typescript
interface TaskGraph {
  readonly nodes: ReadonlyMap<number, Subtask>;
  readonly edges: ReadonlyArray<TaskEdge>;

  getTopologicalOrder(): ReadonlyArray<number>;
  hasCycles(): boolean;
  getExecutableNodes(completed: Set<number>): ReadonlyArray<Subtask>;
}

interface TaskEdge {
  readonly from: number;
  readonly to: number;
}

class DirectedAcyclicGraph implements TaskGraph {
  constructor(private readonly subtasks: ReadonlyArray<Subtask>) {
    this.validateNoCycles();
  }

  getTopologicalOrder(): ReadonlyArray<number> {
    // Kahn's algorithm for topological sort
    // Returns task execution order
  }

  private validateNoCycles(): void {
    // DFS cycle detection
    // Throws if cycle found
  }
}
```

**Dependencies**: None (pure domain logic)

**Testing Strategy**:
- Unit tests for each model method
- DAG validation tests (cycles, dependencies)
- Validation predicate tests
- Status transition tests

---

## Layer 3: Application Layer

**Responsibility**: Orchestrate task execution, manage workflow

**Key Components**:

### DecompositionEngine

```typescript
interface IDecompositionEngine {
  decompose(job: JobDefinition): Promise<Task>;
  recursiveDecompose(job: JobDefinition, maxDepth: number): Promise<Task>;
}

class LLMDecompositionEngine implements IDecompositionEngine {
  constructor(
    private readonly llmProvider: ILLMProvider,
    private readonly validator: IDecompositionValidator
  ) {}

  async decompose(job: JobDefinition): Promise<Task> {
    // 1. Build system prompt with decomposition rules
    // 2. Query LLM with job prompt
    // 3. Parse LLM response into subtasks
    // 4. Build DAG and validate (no cycles, coverage, atomicity)
    // 5. Return Task with subtasks
  }

  private buildSystemPrompt(): string {
    return `
      Decompose the following E2E test job into 3-7 atomic subtasks.
      Each subtask must:
      - Cover a unique part of the job
      - Have a clear validation criterion
      - Specify dependencies by subtask ID
      - Include action type and selector strategy

      Output JSON matching this schema: {...}
    `;
  }
}
```

### ExecutionOrchestrator

```typescript
interface IExecutionOrchestrator {
  execute(task: Task): Promise<ExecutionReport>;
  executeWithRetry(task: Task, maxRetries: number): Promise<ExecutionReport>;
}

class TopologicalExecutionOrchestrator implements IExecutionOrchestrator {
  constructor(
    private readonly executor: IPlaywrightExecutor,
    private readonly validator: IValidationEngine
  ) {}

  async execute(task: Task): Promise<ExecutionReport> {
    const graph = new DirectedAcyclicGraph(task.subtasks);
    const order = graph.getTopologicalOrder();
    const completed = new Set<number>();
    const results = new Map<number, ExecutionResult>();

    for (const subtaskId of order) {
      const subtask = task.subtasks.find(s => s.id === subtaskId)!;

      if (!subtask.canExecute(completed)) {
        subtask.status = TaskStatus.Blocked;
        continue;
      }

      try {
        subtask.status = TaskStatus.InProgress;
        const result = await this.executor.execute(subtask);

        const validationResult = await this.validator.validate(
          subtask,
          result
        );

        if (validationResult.passed) {
          subtask.markComplete(result);
          completed.add(subtaskId);
        } else {
          subtask.markFailed(new Error(validationResult.reason));
        }

        results.set(subtaskId, result);
      } catch (error) {
        subtask.markFailed(error as Error);
      }
    }

    return this.buildReport(task, results);
  }
}
```

### ValidationEngine

```typescript
interface IValidationEngine {
  validate(subtask: Subtask, result: ExecutionResult): Promise<ValidationResult>;
  buildValidators(acceptance: ReadonlyArray<string>): ReadonlyArray<ValidationPredicate>;
}

class PredicateValidationEngine implements IValidationEngine {
  constructor(
    private readonly llmProvider: ILLMProvider,
    private readonly domHelper: IDomHelper
  ) {}

  async validate(
    subtask: Subtask,
    result: ExecutionResult
  ): Promise<ValidationResult> {
    const validations = await Promise.all(
      subtask.acceptance.map(predicate => predicate.evaluate(result))
    );

    const allPassed = validations.every(v => v.passed);

    return {
      passed: allPassed,
      validations,
      reason: allPassed ? undefined : this.buildFailureReason(validations)
    };
  }

  buildValidators(acceptance: ReadonlyArray<string>): ReadonlyArray<ValidationPredicate> {
    return acceptance.map(criteria => this.parseAcceptance(criteria));
  }

  private parseAcceptance(criteria: string): ValidationPredicate {
    // Parse natural language acceptance criteria into validation predicates
    // Examples:
    // "you see a popup" → DomExistsValidation
    // "number 2 in the icon" → TextContainsValidation
    // "you are on the home page" → UrlMatchesValidation
  }
}
```

**Dependencies**: Domain layer (Task, Subtask, ValidationPredicate)

**Testing Strategy**:
- Mock LLM responses for decomposition tests
- Mock executor for orchestration tests
- Integration tests with real Playwright executor
- Error propagation tests
- Retry logic tests

---

## Summary

This layered architecture ensures:

1. **Testability**: Each layer can be tested independently
2. **Type Safety**: Strict TypeScript interfaces throughout
3. **SOLID Compliance**: Clear responsibilities, dependency inversion
4. **Maintainability**: Changes isolated to specific layers
5. **Extensibility**: New providers/executors via interfaces

Next document (00-3) covers Layer 4 (Infrastructure) and Layer 5 (Output/Presentation).
