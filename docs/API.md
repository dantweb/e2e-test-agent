# E2E Test Agent - API Documentation

Complete API reference for E2E Test Agent v1.0

---

## Table of Contents

- [TaskDecomposer](#taskdecomposer)
- [TestOrchestrator](#testorchestrator)
- [DirectedAcyclicGraph](#directedacyclicgraph)
- [Subtask State Machine](#subtask-state-machine)
- [Reporters](#reporters)
- [Executor](#executor)
- [LLM Providers](#llm-providers)

---

## TaskDecomposer

**Location**: `src/application/engines/TaskDecomposer.ts`

Decomposes high-level tasks into executable subtasks with dependency management.

### Methods

#### `buildTaskGraph(subtasks, dependencies?): DirectedAcyclicGraph<Subtask>`

Constructs a task graph from subtasks with optional dependencies.

**Parameters**:
- `subtasks: Subtask[]` - Array of subtasks to include in graph
- `dependencies?: Map<string, string[]>` - Optional dependency map (subtask ID → array of dependency IDs)

**Returns**: `DirectedAcyclicGraph<Subtask>` - Immutable graph structure

**Throws**:
- `Error` if dependency doesn't exist in graph
- `Error` if cycle detected in dependencies

**Example**:
```typescript
const subtasks = [
  new Subtask('sub-1', 'Setup', [setupCmd]),
  new Subtask('sub-2', 'Test', [testCmd]),
  new Subtask('sub-3', 'Verify', [verifyCmd])
];

const dependencies = new Map([
  ['sub-2', ['sub-1']],  // sub-2 depends on sub-1
  ['sub-3', ['sub-2']]   // sub-3 depends on sub-2
]);

const graph = decomposer.buildTaskGraph(subtasks, dependencies);

// Get execution order
const order = graph.topologicalSort();
// Result: ['sub-1', 'sub-2', 'sub-3']
```

**Complexity**: O(V + E) where V = vertices (subtasks), E = edges (dependencies)

---

#### `decomposeTaskWithDependencies(task, steps, dependencies?, continueOnError?): Promise<DecompositionResult>`

Decomposes a task into subtasks and builds dependency graph.

**Parameters**:
- `task: Task` - Task to decompose
- `steps: string[]` - Array of step descriptions
- `dependencies?: Map<string, string[]>` - Optional dependency map
- `continueOnError?: boolean` - Continue if a step fails to decompose (default: false)

**Returns**: `Promise<DecompositionResult>` where:
```typescript
interface DecompositionResult {
  subtasks: Subtask[];
  graph: DirectedAcyclicGraph<Subtask>;
}
```

**Example**:
```typescript
const task = new Task('checkout', 'Complete checkout flow', []);
const steps = [
  'Navigate to product page',
  'Add item to cart',
  'Go to checkout',
  'Complete payment'
];

const dependencies = new Map([
  ['sub-2', ['sub-1']],
  ['sub-3', ['sub-2']],
  ['sub-4', ['sub-3']]
]);

const result = await decomposer.decomposeTaskWithDependencies(
  task,
  steps,
  dependencies
);

console.log(`Generated ${result.subtasks.length} subtasks`);
console.log(`Execution order: ${result.graph.topologicalSort()}`);
```

---

## TestOrchestrator

**Location**: `src/application/orchestrators/TestOrchestrator.ts`

Orchestrates test execution with state tracking and dependency management.

### Methods

#### `executeSubtaskWithStateTracking(subtask): Promise<SubtaskExecutionResult>`

Executes a subtask with automatic state tracking and metadata capture.

**Parameters**:
- `subtask: Subtask` - Subtask to execute

**Returns**: `Promise<SubtaskExecutionResult>` where:
```typescript
interface SubtaskExecutionResult {
  success: boolean;
  subtaskId: string;
  commandsExecuted: number;
  duration: number;  // milliseconds
  error?: string;
}
```

**State Transitions**:
```
Pending → InProgress → Completed (success)
                    → Failed (error)
```

**Example**:
```typescript
const subtask = new Subtask('login', 'Login to app', [
  new OxtestCommand('navigate', { url: 'https://app.com/login' }),
  new OxtestCommand('type', { value: 'admin' }, usernameSelector),
  new OxtestCommand('click', {}, loginButtonSelector)
]);

// Before execution
console.log(subtask.status);  // TaskStatus.Pending

const result = await orchestrator.executeSubtaskWithStateTracking(subtask);

// After execution
console.log(subtask.status);               // TaskStatus.Completed
console.log(subtask.result?.duration);     // e.g., 1234 (ms)
console.log(subtask.result?.timestamp);    // Date object
console.log(result.commandsExecuted);      // 3
```

**Throws**: `Error` if invalid state transition (e.g., executing already-completed subtask)

**Performance**: <1ms overhead for state tracking

---

#### `executeTaskWithStateTracking(task, subtasks): Promise<TaskExecutionResult>`

Executes a complete task with state tracking for all subtasks.

**Parameters**:
- `task: Task` - Task containing setup/teardown commands
- `subtasks: readonly Subtask[]` - Array of subtasks to execute

**Returns**: `Promise<TaskExecutionResult>` where:
```typescript
interface TaskExecutionResult {
  success: boolean;
  taskId: string;
  totalSubtasks: number;
  completed: number;
  failed: number;
  blocked: number;
  duration: number;
}
```

**Behavior**:
- Executes subtasks sequentially
- Marks remaining subtasks as **Blocked** if one fails
- **Always** executes teardown, even on failure
- Captures execution metadata for all subtasks

**Example**:
```typescript
const subtasks = [
  new Subtask('setup', 'Setup environment', [setupCmd]),
  new Subtask('test', 'Run test', [testCmd]),
  new Subtask('verify', 'Verify result', [verifyCmd])
];

const task = new Task(
  'integration-test',
  'Integration test',
  ['setup', 'test', 'verify'],
  [envSetupCmd],      // setup
  [cleanupCmd]        // teardown
);

const result = await orchestrator.executeTaskWithStateTracking(task, subtasks);

// Check results
console.log(`Total: ${result.totalSubtasks}`);
console.log(`Passed: ${result.completed}`);
console.log(`Failed: ${result.failed}`);
console.log(`Blocked: ${result.blocked}`);

// Check individual subtask states
subtasks.forEach(subtask => {
  console.log(`${subtask.id}: ${subtask.status}`);
});
```

**Failure Handling Example**:
```typescript
// If subtask 2 fails:
// - subtask 1: Completed ✅
// - subtask 2: Failed ❌
// - subtask 3: Blocked 🚫 (automatically marked, not executed)
// - teardown: Executed ✅ (always runs)
```

---

## DirectedAcyclicGraph

**Location**: `src/domain/graph/DirectedAcyclicGraph.ts`

Generic directed acyclic graph for managing task dependencies.

### Methods

#### `addNode(id, data): void`

Adds a node to the graph.

**Parameters**:
- `id: string` - Unique node identifier
- `data: T` - Node data (e.g., Subtask)

**Example**:
```typescript
const graph = new DirectedAcyclicGraph<Subtask>();
graph.addNode('sub-1', subtask1);
graph.addNode('sub-2', subtask2);
```

---

#### `addEdge(from, to): void`

Adds a directed edge (dependency) between nodes.

**Parameters**:
- `from: string` - Source node ID (dependency)
- `to: string` - Target node ID (dependent)

**Example**:
```typescript
// sub-2 depends on sub-1
graph.addEdge('sub-1', 'sub-2');
```

---

#### `hasCycle(): boolean`

Detects if graph contains cycles using depth-first search.

**Returns**: `boolean` - true if cycle exists

**Example**:
```typescript
if (graph.hasCycle()) {
  throw new Error('Circular dependency detected!');
}
```

**Complexity**: O(V + E)

---

#### `topologicalSort(): string[]`

Returns nodes in topological order using Kahn's algorithm.

**Returns**: `string[]` - Array of node IDs in execution order

**Throws**: `Error` if graph contains cycle

**Example**:
```typescript
const order = graph.topologicalSort();
// Result: ['sub-1', 'sub-2', 'sub-3']

// Execute in order
for (const nodeId of order) {
  const subtask = graph.getNode(nodeId);
  await execute(subtask);
}
```

**Complexity**: O(V + E)

---

#### `getDependencies(nodeId): string[]`

Gets all direct dependencies for a node.

**Parameters**:
- `nodeId: string` - Node to query

**Returns**: `string[]` - Array of dependency IDs

**Example**:
```typescript
const deps = graph.getDependencies('sub-3');
// Result: ['sub-1', 'sub-2']
```

---

#### `getExecutableNodes(completed): string[]`

Gets nodes that can be executed (all dependencies satisfied).

**Parameters**:
- `completed: Set<string>` - Set of completed node IDs

**Returns**: `string[]` - Array of executable node IDs

**Example**:
```typescript
const completed = new Set(['sub-1']);
const executable = graph.getExecutableNodes(completed);
// Result: ['sub-2', 'sub-4'] (nodes that depend only on sub-1)
```

**Use Case**: Parallel execution (identify independent nodes)

---

## Subtask State Machine

**Location**: `src/domain/entities/Subtask.ts`

State machine for subtask execution tracking.

### States

```typescript
enum TaskStatus {
  Pending = 'pending',
  InProgress = 'in_progress',
  Completed = 'completed',
  Failed = 'failed',
  Blocked = 'blocked'
}
```

### Valid Transitions

```
Pending → InProgress → Completed
                    → Failed
Pending → Blocked
Blocked → InProgress
```

**Terminal States**: `Completed`, `Failed` (cannot transition from these)

### Methods

#### `markInProgress(): void`

Transitions subtask to InProgress state.

**Example**:
```typescript
subtask.markInProgress();
console.log(subtask.status);  // TaskStatus.InProgress
```

---

#### `markCompleted(result): void`

Transitions subtask to Completed state with result.

**Parameters**:
- `result: ExecutionResult` - Execution result with metadata

```typescript
interface ExecutionResult {
  success: true;
  timestamp: Date;
  duration?: number;
  metadata?: {
    commandsExecuted: number;
    subtaskId: string;
  };
}
```

**Example**:
```typescript
subtask.markCompleted({
  success: true,
  timestamp: new Date(),
  duration: 1234,
  metadata: { commandsExecuted: 3, subtaskId: 'sub-1' }
});

console.log(subtask.status);  // TaskStatus.Completed
console.log(subtask.result);  // ExecutionResult object
```

---

#### `markFailed(error, result?): void`

Transitions subtask to Failed state.

**Parameters**:
- `error: Error` - Error that caused failure
- `result?: Partial<ExecutionResult>` - Optional execution metadata

**Example**:
```typescript
subtask.markFailed(
  new Error('Element not found: #login-button'),
  { duration: 500, metadata: { commandsExecuted: 2, subtaskId: 'sub-1' } }
);

console.log(subtask.status);  // TaskStatus.Failed
console.log(subtask.result?.error?.message);  // 'Element not found: #login-button'
```

---

#### `markBlocked(reason): void`

Transitions subtask to Blocked state.

**Parameters**:
- `reason: string` - Reason for blocking

**Example**:
```typescript
subtask.markBlocked('Previous subtask failed: sub-2');

console.log(subtask.status);  // TaskStatus.Blocked
console.log(subtask.result?.error?.message);  // 'Blocked: Previous subtask failed: sub-2'
```

---

### State Query Methods

#### `isPending(): boolean`
#### `isInProgress(): boolean`
#### `isCompleted(): boolean`
#### `isFailed(): boolean`
#### `isBlocked(): boolean`
#### `isTerminal(): boolean`

**Example**:
```typescript
if (subtask.isTerminal()) {
  console.log('Subtask finished');
  if (subtask.isCompleted()) {
    console.log('Success!');
  } else if (subtask.isFailed()) {
    console.log('Failed:', subtask.result?.error?.message);
  }
}
```

---

## Reporters

**Location**: `src/presentation/reporters/`

Generate test reports in multiple formats.

### Reporter Factory

```typescript
import { createReporter } from './presentation/reporters';

const reporter = createReporter('html');  // or 'json', 'junit', 'console'
await reporter.generate(executionReport, outputPath);
```

### IReporter Interface

```typescript
interface IReporter {
  generate(report: ExecutionReport, outputPath?: string): Promise<void>;
}
```

---

### HTMLReporter

Generates interactive HTML dashboard with charts and collapsible sections.

**Example**:
```typescript
const htmlReporter = createReporter('html');
await htmlReporter.generate(executionReport, 'test-report.html');
```

**Output**: Interactive HTML file with:
- Summary statistics (pass/fail counts)
- Execution timeline
- Detailed subtask information
- Collapsible sections
- Styled with CSS

---

### JSONReporter

Generates machine-readable JSON format.

**Example**:
```typescript
const jsonReporter = createReporter('json');
await jsonReporter.generate(executionReport, 'report.json');
```

**Output Format**:
```json
{
  "testName": "Login Test",
  "timestamp": "2025-11-17T10:30:00.000Z",
  "totalSubtasks": 3,
  "passed": 2,
  "failed": 1,
  "blocked": 0,
  "duration": 3456,
  "subtasks": [
    {
      "id": "sub-1",
      "description": "Navigate",
      "status": "completed",
      "duration": 1234,
      "commands": [...]
    }
  ]
}
```

---

### JUnitReporter

Generates JUnit XML for CI/CD integration.

**Example**:
```typescript
const junitReporter = createReporter('junit');
await junitReporter.generate(executionReport, 'junit.xml');
```

**Output**: Standard JUnit XML format compatible with Jenkins, GitLab CI, GitHub Actions.

---

### ConsoleReporter

Prints colored output to terminal.

**Example**:
```typescript
const consoleReporter = createReporter('console');
await consoleReporter.generate(executionReport);
```

**Output**: Color-coded terminal output with progress tracking.

---

## Executor

**Location**: `src/infrastructure/executors/PlaywrightExecutor.ts`

Executes Oxtest commands using Playwright.

### Methods

#### `execute(command): Promise<ExecutionResult>`

Executes a single Oxtest command.

**Parameters**:
- `command: OxtestCommand` - Command to execute

**Returns**: `Promise<ExecutionResult>`

**Example**:
```typescript
const executor = new PlaywrightExecutor(page);

const result = await executor.execute(
  new OxtestCommand('navigate', { url: 'https://example.com' })
);

if (result.success) {
  console.log('Command succeeded');
} else {
  console.error('Command failed:', result.error);
}
```

---

## LLM Providers

**Location**: `src/infrastructure/llm/`

LLM provider implementations for test decomposition.

### OpenAILLMProvider

**Example**:
```typescript
import { OpenAILLMProvider } from './infrastructure/llm/OpenAILLMProvider';

const provider = new OpenAILLMProvider({
  apiKey: process.env.OPENAI_API_KEY,
  model: 'gpt-4'
});

const response = await provider.decompose(
  'Navigate to the login page and enter credentials'
);
```

---

### AnthropicLLMProvider

**Example**:
```typescript
import { AnthropicLLMProvider } from './infrastructure/llm/AnthropicLLMProvider';

const provider = new AnthropicLLMProvider({
  apiKey: process.env.ANTHROPIC_API_KEY,
  model: 'claude-3-5-sonnet-20241022'
});

const response = await provider.decompose(
  'Complete the checkout process'
);
```

---

## Type Definitions

### ExecutionReport

```typescript
interface ExecutionReport {
  testName: string;
  timestamp: Date;
  totalSubtasks: number;
  passed: number;
  failed: number;
  blocked: number;
  duration: number;  // milliseconds
  subtasks: SubtaskReport[];
}
```

### SubtaskReport

```typescript
interface SubtaskReport {
  id: string;
  description: string;
  status: TaskStatus;
  duration?: number;
  commands: OxtestCommand[];
  result?: ExecutionResult;
}
```

### ExecutionResult

```typescript
interface ExecutionResult {
  success: boolean;
  timestamp: Date;
  duration?: number;
  error?: {
    message: string;
    stack?: string;
  };
  metadata?: {
    commandsExecuted: number;
    subtaskId: string;
    failedCommand?: string;
  };
}
```

---

## Best Practices

### 1. Always Use State Tracking

```typescript
// Good: State tracking enabled
const result = await orchestrator.executeSubtaskWithStateTracking(subtask);

// Avoid: Direct execution without state tracking
const result = await orchestrator.executeSubtask(subtask);
```

### 2. Verify Graph Before Execution

```typescript
const graph = decomposer.buildTaskGraph(subtasks, dependencies);

// Check for cycles
if (graph.hasCycle()) {
  throw new Error('Invalid dependency chain!');
}

// Get execution order
const order = graph.topologicalSort();
console.log('Will execute in order:', order);
```

### 3. Handle Terminal States

```typescript
if (subtask.isTerminal()) {
  // Don't try to execute again
  console.log('Subtask already finished:', subtask.status);
} else {
  await orchestrator.executeSubtaskWithStateTracking(subtask);
}
```

### 4. Use Task-Level Execution for Automatic Blocking

```typescript
// This handles failure cascades automatically
const result = await orchestrator.executeTaskWithStateTracking(task, subtasks);

// Blocked subtasks are already marked
const blockedCount = subtasks.filter(s => s.isBlocked()).length;
console.log(`${blockedCount} subtasks were blocked`);
```

### 5. Generate Multiple Report Formats

```typescript
const reporters = ['html', 'json', 'junit', 'console'];

for (const format of reporters) {
  const reporter = createReporter(format);
  await reporter.generate(executionReport, `report.${format}`);
}
```

---

## Performance Characteristics

| Operation | Complexity | Typical Time |
|-----------|------------|--------------|
| `buildTaskGraph()` | O(V + E) | <1ms for 100 nodes |
| `topologicalSort()` | O(V + E) | <1ms for 100 nodes |
| `hasCycle()` | O(V + E) | <1ms for 100 nodes |
| `executeSubtaskWithStateTracking()` | O(commands) | <1ms overhead + command execution |
| State transition | O(1) | <1ms |
| Report generation (HTML) | O(subtasks) | <10ms for 100 subtasks |
| Report generation (JSON) | O(subtasks) | <5ms for 100 subtasks |

---

## Error Handling

All methods throw descriptive errors:

```typescript
try {
  const graph = decomposer.buildTaskGraph(subtasks, dependencies);
} catch (error) {
  if (error.message.includes('cycle')) {
    console.error('Circular dependency detected');
  } else if (error.message.includes('does not exist')) {
    console.error('Invalid dependency reference');
  }
}
```

---

## Additional Resources

- [Sprint 6 Documentation](./e2e-tester-agent/implementation/done/sprint-6-COMPLETED.md) - TaskGraph details
- [Sprint 7 Documentation](./e2e-tester-agent/implementation/done/sprint-7-COMPLETED.md) - State machine details
- [Sprint 18 Documentation](./e2e-tester-agent/implementation/done/sprint-18-COMPLETED.md) - Reporter details
- [Troubleshooting Guide](./TROUBLESHOOTING.md) - Common issues

---

**Last Updated**: November 17, 2025
**API Version**: 1.0.0
