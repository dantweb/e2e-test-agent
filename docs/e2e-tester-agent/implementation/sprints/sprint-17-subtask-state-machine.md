# Sprint 17: Subtask State Machine Implementation

**Priority**: HIGH (Critical Gap)
**Duration**: 2 days
**Dependencies**: Sprint 15 (DAG), Sprint 16 (ValidationPredicates)
**Status**: PLANNED
**Addresses**: Architecture Deviation - Incomplete Subtask Entity

---

## 🎯 Sprint Goals

Implement complete state machine pattern for Subtask entity as documented in architecture.

**Missing Features**:
- Status tracking (pending, in_progress, completed, failed, blocked)
- State transition methods (markComplete, markFailed, markBlocked)
- Execution result storage
- State transition validation

---

## 📋 Key Tasks

### 1. Create TaskStatus Enum (0.25 days)
```typescript
// src/domain/enums/TaskStatus.ts
export enum TaskStatus {
  Pending = 'pending',
  InProgress = 'in_progress',
  Completed = 'completed',
  Failed = 'failed',
  Blocked = 'blocked',
}

// Valid state transitions
export const VALID_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  [TaskStatus.Pending]: [TaskStatus.InProgress, TaskStatus.Blocked],
  [TaskStatus.InProgress]: [TaskStatus.Completed, TaskStatus.Failed],
  [TaskStatus.Completed]: [], // Terminal state
  [TaskStatus.Failed]: [], // Terminal state
  [TaskStatus.Blocked]: [TaskStatus.InProgress], // Can retry
};

export function isValidTransition(from: TaskStatus, to: TaskStatus): boolean {
  return VALID_TRANSITIONS[from].includes(to);
}
```

### 2. Create ExecutionResult Interface (0.25 days)
```typescript
// src/domain/interfaces/ExecutionResult.ts
export interface ExecutionResult {
  readonly success: boolean;
  readonly output?: string;
  readonly error?: Error;
  readonly screenshots?: ReadonlyArray<string>;
  readonly duration?: number;
  readonly timestamp?: Date;
}
```

### 3. Enhance Subtask Entity (1 day)
```typescript
// Modify src/domain/entities/Subtask.ts
export class Subtask {
  // NEW fields
  public status: TaskStatus; // Mutable for state tracking
  public result?: ExecutionResult; // Set after execution
  private executionStartTime?: number;

  constructor(params: SubtaskConstructorParams) {
    // ... existing initialization
    this.status = TaskStatus.Pending;
  }

  // STATE TRANSITION METHODS

  public markInProgress(): void {
    this.validateTransition(TaskStatus.InProgress);
    this.status = TaskStatus.InProgress;
    this.executionStartTime = Date.now();
  }

  public markCompleted(result: ExecutionResult): void {
    this.validateTransition(TaskStatus.Completed);
    this.status = TaskStatus.Completed;
    this.result = {
      ...result,
      success: true,
      duration: this.executionStartTime
        ? Date.now() - this.executionStartTime
        : undefined,
      timestamp: new Date(),
    };
  }

  public markFailed(error: Error, result?: Partial<ExecutionResult>): void {
    this.validateTransition(TaskStatus.Failed);
    this.status = TaskStatus.Failed;
    this.result = {
      success: false,
      error,
      duration: this.executionStartTime
        ? Date.now() - this.executionStartTime
        : undefined,
      timestamp: new Date(),
      ...result,
    };
  }

  public markBlocked(reason: string): void {
    this.validateTransition(TaskStatus.Blocked);
    this.status = TaskStatus.Blocked;
    this.result = {
      success: false,
      error: new Error(`Blocked: ${reason}`),
      timestamp: new Date(),
    };
  }

  private validateTransition(toStatus: TaskStatus): void {
    if (!isValidTransition(this.status, toStatus)) {
      throw new Error(
        `Invalid state transition: ${this.status} → ${toStatus}. ` +
        `Valid transitions from ${this.status}: ${VALID_TRANSITIONS[this.status].join(', ')}`
      );
    }
  }

  // STATE QUERY METHODS

  public isPending(): boolean {
    return this.status === TaskStatus.Pending;
  }

  public isInProgress(): boolean {
    return this.status === TaskStatus.InProgress;
  }

  public isCompleted(): boolean {
    return this.status === TaskStatus.Completed;
  }

  public isFailed(): boolean {
    return this.status === TaskStatus.Failed;
  }

  public isBlocked(): boolean {
    return this.status === TaskStatus.Blocked;
  }

  public isTerminal(): boolean {
    return this.isCompleted() || this.isFailed();
  }

  // ... existing methods
}
```

### 4. Update TestOrchestrator to Use State Machine (0.5 days)
```typescript
// Use markInProgress(), markCompleted(), markFailed()
for (const subtaskId of executionOrder) {
  const subtask = subtasks.find(s => s.id === subtaskId)!;

  if (!subtask.canExecute(completed)) {
    subtask.markBlocked('Dependencies not satisfied');
    continue;
  }

  try {
    subtask.markInProgress();
    const result = await this.executeSubtask(subtask);

    if (result.success) {
      subtask.markCompleted(result);
      completed.add(subtaskId);
    } else {
      subtask.markFailed(new Error('Execution failed'), result);
    }
  } catch (error) {
    subtask.markFailed(error as Error);
  }
}
```

---

## 🧪 Testing Strategy

### Unit Tests (30+ tests)
- State transitions (all valid paths)
- Invalid transitions (error cases)
- State query methods
- Execution result storage
- Duration calculation
- Timestamp tracking

### Integration Tests (10+ tests)
- Full subtask lifecycle
- TestOrchestrator with state machine
- Blocked subtasks handling
- Failed subtasks recovery

---

## 📊 Success Metrics

- ✅ 40+ new tests passing
- ✅ All state transitions validated
- ✅ No invalid transitions possible
- ✅ Execution timing accurate
- ✅ TestOrchestrator uses state machine
- ✅ Architecture alignment: 95% → 98%

---

## 🚀 Deliverables

1. TaskStatus enum with validation
2. ExecutionResult interface
3. Enhanced Subtask with state machine
4. Updated TestOrchestrator
5. 40+ tests
6. State machine diagram

---

**Files to Create** (2 files):
- `src/domain/enums/TaskStatus.ts`
- `src/domain/interfaces/ExecutionResult.ts`

**Files to Modify** (2 files):
- `src/domain/entities/Subtask.ts`
- `src/application/orchestrators/TestOrchestrator.ts`

---

**Sprint Owner**: TBD
**Start Date**: TBD (After Sprint 15 & 16)
**Target End Date**: TBD
