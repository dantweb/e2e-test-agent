# Sprint 10: Domain Layer Enrichment

**Priority**: HIGH
**Duration**: 3-5 days
**Dependencies**: None
**Status**: PLANNED

---

## 🎯 Sprint Goals

Enrich the domain layer to fully align with the documented architecture by implementing:
1. DirectedAcyclicGraph for topological task execution
2. Enhanced Subtask entity with status, dependencies, and acceptance criteria
3. Domain-level ValidationPredicate implementations
4. Task status state machine

---

## 📋 Tasks

### Task 1: Implement DirectedAcyclicGraph
**Estimated**: 1-2 days

**Subtasks**:
1. Create `DirectedAcyclicGraph` class
   - Constructor accepts subtasks array
   - Builds internal graph representation

2. Implement topological sort (Kahn's algorithm)
   ```typescript
   getTopologicalOrder(): ReadonlyArray<number>
   ```

3. Implement cycle detection (DFS)
   ```typescript
   hasCycles(): boolean
   private validateNoCycles(): void // throws if cycle found
   ```

4. Implement executable node identification
   ```typescript
   getExecutableNodes(completed: Set<number>): ReadonlyArray<Subtask>
   ```

5. Add edge management
   ```typescript
   interface TaskEdge {
     readonly from: number;
     readonly to: number;
   }
   ```

**Files to Create**:
- `src/domain/entities/DirectedAcyclicGraph.ts`
- `src/domain/interfaces/TaskGraph.ts`

**Tests to Write**:
- `tests/unit/domain/DirectedAcyclicGraph.test.ts`:
  - Valid DAG construction
  - Cycle detection (various patterns)
  - Topological sort correctness
  - Executable nodes identification
  - Empty graph handling
  - Single node graph
  - Complex dependency chains

**Acceptance Criteria**:
- ✅ DAG correctly detects all cycle patterns
- ✅ Topological sort produces valid execution order
- ✅ getExecutableNodes respects dependencies
- ✅ Handles edge cases (empty, single node)
- ✅ All tests pass with 100% coverage

---

### Task 2: Enrich Subtask Entity
**Estimated**: 1 day

**Subtasks**:
1. Add new fields to Subtask interface:
   ```typescript
   interface Subtask {
     readonly id: number;
     readonly title: string;
     readonly prompt: string;
     readonly commands: ReadonlyArray<OxtestCommand>;
     readonly dependencies: ReadonlyArray<number>; // NEW
     readonly acceptance: ReadonlyArray<ValidationPredicate>; // NEW
     status: TaskStatus; // NEW (mutable for state tracking)
     result?: ExecutionResult; // NEW
   }
   ```

2. Implement state management methods:
   ```typescript
   canExecute(completedTasks: Set<number>): boolean {
     return this.dependencies.every(dep => completedTasks.has(dep));
   }

   markComplete(result: ExecutionResult): void {
     this.status = TaskStatus.Completed;
     this.result = result;
   }

   markFailed(error: Error): void {
     this.status = TaskStatus.Failed;
     this.result = { error };
   }
   ```

3. Update constructor to accept new fields

4. Update validation logic

**Files to Modify**:
- `src/domain/entities/Subtask.ts`

**Tests to Update**:
- `tests/unit/domain/Subtask.test.ts`:
  - Test new fields
  - Test canExecute with various dependency scenarios
  - Test markComplete/markFailed state transitions
  - Test status tracking

**Acceptance Criteria**:
- ✅ Subtask accepts dependencies array
- ✅ canExecute correctly evaluates dependencies
- ✅ State transitions work correctly
- ✅ Immutability preserved (except status)
- ✅ All existing tests still pass
- ✅ New tests achieve 100% coverage

---

### Task 3: Create TaskStatus Enum
**Estimated**: 0.5 days

**Subtasks**:
1. Create TaskStatus enum:
   ```typescript
   enum TaskStatus {
     Pending = 'pending',
     InProgress = 'in_progress',
     Completed = 'completed',
     Failed = 'failed',
     Blocked = 'blocked'
   }
   ```

2. Create state transition validation:
   ```typescript
   const VALID_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
     [TaskStatus.Pending]: [TaskStatus.InProgress, TaskStatus.Blocked],
     [TaskStatus.InProgress]: [TaskStatus.Completed, TaskStatus.Failed],
     [TaskStatus.Completed]: [],
     [TaskStatus.Failed]: [],
     [TaskStatus.Blocked]: [TaskStatus.InProgress],
   };
   ```

3. Add validation helper:
   ```typescript
   function isValidTransition(from: TaskStatus, to: TaskStatus): boolean
   ```

**Files to Create**:
- `src/domain/enums/TaskStatus.ts`

**Tests to Write**:
- `tests/unit/domain/TaskStatus.test.ts`:
  - Valid transitions
  - Invalid transitions
  - All enum values tested

**Acceptance Criteria**:
- ✅ Enum defines all status values
- ✅ Transition validation works correctly
- ✅ Used in Subtask entity
- ✅ All tests pass

---

### Task 4: Implement Domain-Level ValidationPredicate
**Estimated**: 1-2 days

**Subtasks**:
1. Create ValidationType enum:
   ```typescript
   enum ValidationType {
     DomExists = 'dom_exists',
     TextContains = 'text_contains',
     UrlMatches = 'url_matches',
     CountEquals = 'count_equals',
     ValueEquals = 'value_equals',
     Visible = 'visible',
     NotExists = 'not_exists'
   }
   ```

2. Create ValidationPredicate interface:
   ```typescript
   interface ValidationPredicate {
     readonly type: ValidationType;
     readonly criteria: string;
     readonly params: Record<string, unknown>;
     evaluate(context: ValidationContext): Promise<ValidationResult>;
   }
   ```

3. Implement DomExistsValidation:
   ```typescript
   class DomExistsValidation implements ValidationPredicate {
     constructor(
       readonly criteria: string,
       readonly params: { selector: string; visible?: boolean }
     ) {}

     async evaluate(context: ValidationContext): Promise<ValidationResult> {
       // Implementation
     }
   }
   ```

4. Implement other validation classes:
   - TextContainsValidation
   - UrlMatchesValidation
   - CountEqualsValidation
   - ValueEqualsValidation
   - VisibleValidation
   - NotExistsValidation

**Files to Create**:
- `src/domain/enums/ValidationType.ts`
- `src/domain/interfaces/ValidationPredicate.ts`
- `src/domain/validation/DomExistsValidation.ts`
- `src/domain/validation/TextContainsValidation.ts`
- `src/domain/validation/UrlMatchesValidation.ts`
- `src/domain/validation/CountEqualsValidation.ts`
- `src/domain/validation/ValueEqualsValidation.ts`
- `src/domain/validation/VisibleValidation.ts`
- `src/domain/validation/NotExistsValidation.ts`
- `src/domain/validation/index.ts` (barrel export)

**Tests to Write**:
- `tests/unit/domain/validation/*.test.ts` for each class
  - Successful validation
  - Failed validation
  - Error handling
  - Edge cases

**Acceptance Criteria**:
- ✅ All validation types implemented
- ✅ Each class has clear interface
- ✅ evaluate() method works correctly
- ✅ Error handling is robust
- ✅ All tests pass with 100% coverage

---

### Task 5: Add Task Metadata Field
**Estimated**: 0.5 days

**Subtasks**:
1. Add metadata field to Task interface:
   ```typescript
   interface TaskMetadata {
     readonly author?: string;
     readonly created?: Date;
     readonly tags?: ReadonlyArray<string>;
     readonly parallelism?: number;
     readonly timeout?: number;
     readonly retries?: number;
     readonly custom?: Record<string, unknown>;
   }

   interface Task {
     // ... existing fields
     readonly metadata: TaskMetadata;
   }
   ```

2. Update Task constructor

3. Update tests

**Files to Modify**:
- `src/domain/entities/Task.ts`
- `src/domain/interfaces/TaskMetadata.ts` (create)

**Tests to Update**:
- `tests/unit/domain/Task.test.ts`

**Acceptance Criteria**:
- ✅ Metadata field added
- ✅ Optional fields work correctly
- ✅ Tests updated and passing

---

### Task 6: Update Application Layer to Use New Domain Features
**Estimated**: 1 day

**Subtasks**:
1. Update TestOrchestrator to use DAG:
   ```typescript
   async execute(task: Task): Promise<ExecutionReport> {
     const graph = new DirectedAcyclicGraph(task.subtasks);
     const order = graph.getTopologicalOrder();
     const completed = new Set<number>();

     for (const subtaskId of order) {
       const subtask = task.subtasks.find(s => s.id === subtaskId)!;

       if (!subtask.canExecute(completed)) {
         subtask.status = TaskStatus.Blocked;
         continue;
       }

       // Execute subtask...
     }
   }
   ```

2. Update PredicateValidationEngine to use domain validations

3. Update ConfigValidator to create ValidationPredicate instances

**Files to Modify**:
- `src/application/orchestrators/TestOrchestrator.ts`
- `src/application/orchestrators/PredicateValidationEngine.ts`
- `src/configuration/ConfigValidator.ts`

**Tests to Update**:
- `tests/unit/application/orchestrators/TestOrchestrator.test.ts`
- `tests/unit/application/orchestrators/PredicateValidationEngine.test.ts`
- `tests/unit/configuration/ConfigValidator.test.ts`

**Acceptance Criteria**:
- ✅ TestOrchestrator uses DAG for execution order
- ✅ Validation engine uses domain predicates
- ✅ Integration tests pass
- ✅ No regression in existing functionality

---

## 🧪 Testing Strategy

### Unit Tests
- Each class has dedicated test file
- 100% code coverage target
- Edge cases covered
- Error scenarios tested

### Integration Tests
- DAG + Orchestrator integration
- ValidationPredicate + ValidationEngine integration
- End-to-end task execution with dependencies

### Performance Tests
- DAG performance with large graphs (100+ nodes)
- Topological sort efficiency
- Validation predicate evaluation speed

---

## 📊 Success Metrics

- ✅ All unit tests pass (target: 100 new tests)
- ✅ Code coverage > 95%
- ✅ No regression in existing tests
- ✅ DAG handles graphs with 100+ nodes in < 100ms
- ✅ Validation predicates evaluate in < 50ms each
- ✅ Architecture alignment score: 75% → 95%

---

## 🚀 Sprint Deliverables

1. **Code**:
   - DirectedAcyclicGraph implementation
   - Enhanced Subtask entity
   - TaskStatus enum
   - ValidationPredicate implementations
   - Updated Task entity

2. **Tests**:
   - 100+ new unit tests
   - 20+ integration tests
   - Performance benchmarks

3. **Documentation**:
   - JSDoc for all new classes
   - Architecture diagrams updated
   - Migration guide (if needed)

---

## ⚠️ Risks and Mitigation

### Risk 1: Breaking Changes
**Impact**: HIGH
**Mitigation**:
- Deprecate old APIs gradually
- Maintain backward compatibility where possible
- Update all consumers simultaneously

### Risk 2: Performance Degradation
**Impact**: MEDIUM
**Mitigation**:
- Profile before and after
- Benchmark critical paths
- Optimize hot paths

### Risk 3: Complex Testing
**Impact**: MEDIUM
**Mitigation**:
- Start with simple cases
- Build test helpers
- Use property-based testing for DAG

---

## 📝 Definition of Done

- [ ] All code implemented and reviewed
- [ ] All tests written and passing
- [ ] Code coverage > 95%
- [ ] Documentation complete
- [ ] No linting errors
- [ ] Performance benchmarks met
- [ ] Integration tests pass
- [ ] Sprint review completed
- [ ] Code merged to main branch

---

**Sprint Owner**: TBD
**Reviewers**: TBD
**Start Date**: TBD
**Target End Date**: TBD
