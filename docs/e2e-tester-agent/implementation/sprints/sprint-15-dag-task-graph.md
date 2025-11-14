# Sprint 15: Task Graph/DAG Implementation

**Priority**: HIGH (Critical Gap)
**Duration**: 3-4 days
**Dependencies**: None
**Status**: PLANNED
**Addresses**: Architecture Deviation - Missing Task Graph/DAG

---

## 🎯 Sprint Goals

Implement the DirectedAcyclicGraph (TaskGraph) as documented in Layer 2 architecture to enable:
- Topological task execution order
- Cycle detection in task dependencies
- Parallel execution capability
- Proper dependency management

---

## 📋 Detailed Tasks

### Task 1: Create TaskGraph Interface (0.5 days)

**Implementation**:
```typescript
// src/domain/interfaces/TaskGraph.ts

export interface TaskEdge {
  readonly from: number;
  readonly to: number;
}

export interface ITaskGraph {
  readonly nodes: ReadonlyMap<number, Subtask>;
  readonly edges: ReadonlyArray<TaskEdge>;

  /**
   * Returns tasks in topological order (Kahn's algorithm)
   * @throws Error if graph contains cycles
   */
  getTopologicalOrder(): ReadonlyArray<number>;

  /**
   * Checks if graph contains cycles using DFS
   */
  hasCycles(): boolean;

  /**
   * Returns subtasks that can be executed given completed tasks
   * @param completed Set of completed subtask IDs
   */
  getExecutableNodes(completed: Set<number>): ReadonlyArray<Subtask>;

  /**
   * Returns all direct dependencies of a subtask
   */
  getDependencies(subtaskId: number): ReadonlyArray<number>;

  /**
   * Returns all subtasks that depend on given subtask
   */
  getDependents(subtaskId: number): ReadonlyArray<number>;
}
```

**Files to Create**:
- `src/domain/interfaces/TaskGraph.ts`

**Tests**:
- Interface compatibility tests

---

### Task 2: Implement DirectedAcyclicGraph Class (2 days)

**Implementation**:
```typescript
// src/domain/entities/DirectedAcyclicGraph.ts

import { Subtask } from './Subtask';
import { ITaskGraph, TaskEdge } from '../interfaces/TaskGraph';

export class DirectedAcyclicGraph implements ITaskGraph {
  public readonly nodes: ReadonlyMap<number, Subtask>;
  public readonly edges: ReadonlyArray<TaskEdge>;
  private readonly adjacencyList: Map<number, Set<number>>;
  private readonly reverseAdjacencyList: Map<number, Set<number>>;

  constructor(subtasks: ReadonlyArray<Subtask>) {
    this.nodes = new Map(subtasks.map(s => [s.id, s]));
    this.edges = this.buildEdges(subtasks);
    this.adjacencyList = this.buildAdjacencyList(this.edges);
    this.reverseAdjacencyList = this.buildReverseAdjacencyList(this.edges);

    // Validate no cycles on construction
    this.validateNoCycles();
  }

  private buildEdges(subtasks: ReadonlyArray<Subtask>): ReadonlyArray<TaskEdge> {
    const edges: TaskEdge[] = [];
    for (const subtask of subtasks) {
      if (subtask.dependencies) {
        for (const depId of subtask.dependencies) {
          edges.push({ from: depId, to: subtask.id });
        }
      }
    }
    return Object.freeze(edges);
  }

  private buildAdjacencyList(edges: ReadonlyArray<TaskEdge>): Map<number, Set<number>> {
    const adj = new Map<number, Set<number>>();

    // Initialize with all node IDs
    for (const [id] of this.nodes) {
      adj.set(id, new Set());
    }

    // Add edges
    for (const edge of edges) {
      adj.get(edge.from)!.add(edge.to);
    }

    return adj;
  }

  private buildReverseAdjacencyList(edges: ReadonlyArray<TaskEdge>): Map<number, Set<number>> {
    const revAdj = new Map<number, Set<number>>();

    // Initialize with all node IDs
    for (const [id] of this.nodes) {
      revAdj.set(id, new Set());
    }

    // Add reverse edges
    for (const edge of edges) {
      revAdj.get(edge.to)!.add(edge.from);
    }

    return revAdj;
  }

  /**
   * Kahn's algorithm for topological sort
   * Time complexity: O(V + E)
   */
  public getTopologicalOrder(): ReadonlyArray<number> {
    // Calculate in-degree for each node
    const inDegree = new Map<number, number>();
    for (const [id] of this.nodes) {
      inDegree.set(id, 0);
    }

    for (const edge of this.edges) {
      inDegree.set(edge.to, inDegree.get(edge.to)! + 1);
    }

    // Queue for nodes with no incoming edges
    const queue: number[] = [];
    for (const [id, degree] of inDegree) {
      if (degree === 0) {
        queue.push(id);
      }
    }

    // Process nodes
    const result: number[] = [];
    while (queue.length > 0) {
      const current = queue.shift()!;
      result.push(current);

      // Reduce in-degree for neighbors
      const neighbors = this.adjacencyList.get(current)!;
      for (const neighbor of neighbors) {
        const newDegree = inDegree.get(neighbor)! - 1;
        inDegree.set(neighbor, newDegree);

        if (newDegree === 0) {
          queue.push(neighbor);
        }
      }
    }

    // If result doesn't contain all nodes, there's a cycle
    if (result.length !== this.nodes.size) {
      throw new Error('Graph contains cycles - cannot produce topological order');
    }

    return Object.freeze(result);
  }

  /**
   * Detect cycles using DFS with color marking
   * White (0): Not visited
   * Gray (1): Currently visiting (in stack)
   * Black (2): Finished visiting
   */
  public hasCycles(): boolean {
    const colors = new Map<number, number>();

    // Initialize all as white
    for (const [id] of this.nodes) {
      colors.set(id, 0);
    }

    // DFS from each unvisited node
    for (const [id] of this.nodes) {
      if (colors.get(id) === 0) {
        if (this.hasCycleDFS(id, colors)) {
          return true;
        }
      }
    }

    return false;
  }

  private hasCycleDFS(nodeId: number, colors: Map<number, number>): boolean {
    // Mark as gray (visiting)
    colors.set(nodeId, 1);

    // Visit neighbors
    const neighbors = this.adjacencyList.get(nodeId)!;
    for (const neighbor of neighbors) {
      const color = colors.get(neighbor)!;

      // If gray, we found a back edge (cycle)
      if (color === 1) {
        return true;
      }

      // If white, recursively visit
      if (color === 0) {
        if (this.hasCycleDFS(neighbor, colors)) {
          return true;
        }
      }
    }

    // Mark as black (finished)
    colors.set(nodeId, 2);
    return false;
  }

  private validateNoCycles(): void {
    if (this.hasCycles()) {
      throw new Error(
        'Task graph contains cycles. Tasks cannot have circular dependencies. ' +
        'Please review task dependencies and remove any cycles.'
      );
    }
  }

  public getExecutableNodes(completed: Set<number>): ReadonlyArray<Subtask> {
    const executable: Subtask[] = [];

    for (const [id, subtask] of this.nodes) {
      // Skip if already completed
      if (completed.has(id)) {
        continue;
      }

      // Check if all dependencies are satisfied
      const dependencies = this.reverseAdjacencyList.get(id)!;
      const canExecute = Array.from(dependencies).every(depId => completed.has(depId));

      if (canExecute) {
        executable.push(subtask);
      }
    }

    return Object.freeze(executable);
  }

  public getDependencies(subtaskId: number): ReadonlyArray<number> {
    const deps = this.reverseAdjacencyList.get(subtaskId);
    return deps ? Object.freeze(Array.from(deps)) : Object.freeze([]);
  }

  public getDependents(subtaskId: number): ReadonlyArray<number> {
    const deps = this.adjacencyList.get(subtaskId);
    return deps ? Object.freeze(Array.from(deps)) : Object.freeze([]);
  }

  /**
   * Returns a string representation for debugging
   */
  public toString(): string {
    const lines = [`DirectedAcyclicGraph with ${this.nodes.size} nodes and ${this.edges.length} edges:`];

    for (const [id, subtask] of this.nodes) {
      const deps = this.getDependencies(id);
      const depsStr = deps.length > 0 ? ` (depends on: ${deps.join(', ')})` : '';
      lines.push(`  ${id}: ${subtask.title}${depsStr}`);
    }

    return lines.join('\n');
  }
}
```

**Files to Create**:
- `src/domain/entities/DirectedAcyclicGraph.ts`

**Tests to Write** (`tests/unit/domain/DirectedAcyclicGraph.test.ts`):

```typescript
describe('DirectedAcyclicGraph', () => {
  describe('constructor', () => {
    it('should create DAG from subtasks without dependencies', () => {
      const subtasks = [
        createSubtask(1, 'Task 1', []),
        createSubtask(2, 'Task 2', []),
      ];

      const dag = new DirectedAcyclicGraph(subtasks);

      expect(dag.nodes.size).toBe(2);
      expect(dag.edges.length).toBe(0);
    });

    it('should create DAG from subtasks with dependencies', () => {
      const subtasks = [
        createSubtask(1, 'Task 1', []),
        createSubtask(2, 'Task 2', [1]),
        createSubtask(3, 'Task 3', [1, 2]),
      ];

      const dag = new DirectedAcyclicGraph(subtasks);

      expect(dag.nodes.size).toBe(3);
      expect(dag.edges.length).toBe(3);
    });

    it('should throw error on cycle detection (simple cycle)', () => {
      const subtasks = [
        createSubtask(1, 'Task 1', [2]),
        createSubtask(2, 'Task 2', [1]),
      ];

      expect(() => new DirectedAcyclicGraph(subtasks)).toThrow('contains cycles');
    });

    it('should throw error on cycle detection (complex cycle)', () => {
      const subtasks = [
        createSubtask(1, 'Task 1', []),
        createSubtask(2, 'Task 2', [1]),
        createSubtask(3, 'Task 3', [2]),
        createSubtask(4, 'Task 4', [3, 1]),
        createSubtask(5, 'Task 5', [4, 2]),
      ];

      // No cycle yet
      expect(() => new DirectedAcyclicGraph(subtasks)).not.toThrow();

      // Add cycle: 2 -> 5
      subtasks[1] = createSubtask(2, 'Task 2', [1, 5]);
      expect(() => new DirectedAcyclicGraph(subtasks)).toThrow('contains cycles');
    });

    it('should throw error on self-loop', () => {
      const subtasks = [createSubtask(1, 'Task 1', [1])];

      expect(() => new DirectedAcyclicGraph(subtasks)).toThrow('contains cycles');
    });
  });

  describe('getTopologicalOrder', () => {
    it('should return correct order for linear dependency chain', () => {
      const subtasks = [
        createSubtask(1, 'Task 1', []),
        createSubtask(2, 'Task 2', [1]),
        createSubtask(3, 'Task 3', [2]),
      ];

      const dag = new DirectedAcyclicGraph(subtasks);
      const order = dag.getTopologicalOrder();

      expect(order).toEqual([1, 2, 3]);
    });

    it('should return valid order for diamond dependency', () => {
      const subtasks = [
        createSubtask(1, 'Task 1', []),
        createSubtask(2, 'Task 2', [1]),
        createSubtask(3, 'Task 3', [1]),
        createSubtask(4, 'Task 4', [2, 3]),
      ];

      const dag = new DirectedAcyclicGraph(subtasks);
      const order = dag.getTopologicalOrder();

      // Task 1 must come first, Task 4 must come last
      expect(order[0]).toBe(1);
      expect(order[3]).toBe(4);

      // Tasks 2 and 3 can be in any order but must come after 1 and before 4
      expect(order.indexOf(2)).toBeGreaterThan(order.indexOf(1));
      expect(order.indexOf(2)).toBeLessThan(order.indexOf(4));
      expect(order.indexOf(3)).toBeGreaterThan(order.indexOf(1));
      expect(order.indexOf(3)).toBeLessThan(order.indexOf(4));
    });

    it('should return order for complex graph', () => {
      const subtasks = [
        createSubtask(1, 'Task 1', []),
        createSubtask(2, 'Task 2', []),
        createSubtask(3, 'Task 3', [1]),
        createSubtask(4, 'Task 4', [1, 2]),
        createSubtask(5, 'Task 5', [3, 4]),
      ];

      const dag = new DirectedAcyclicGraph(subtasks);
      const order = dag.getTopologicalOrder();

      expect(order.length).toBe(5);

      // Verify all dependencies are satisfied
      const seen = new Set<number>();
      for (const id of order) {
        const deps = dag.getDependencies(id);
        for (const dep of deps) {
          expect(seen.has(dep)).toBe(true);
        }
        seen.add(id);
      }
    });

    it('should handle empty graph', () => {
      const dag = new DirectedAcyclicGraph([]);
      const order = dag.getTopologicalOrder();

      expect(order).toEqual([]);
    });

    it('should handle single node', () => {
      const subtasks = [createSubtask(1, 'Task 1', [])];
      const dag = new DirectedAcyclicGraph(subtasks);
      const order = dag.getTopologicalOrder();

      expect(order).toEqual([1]);
    });
  });

  describe('hasCycles', () => {
    it('should return false for acyclic graph', () => {
      const subtasks = [
        createSubtask(1, 'Task 1', []),
        createSubtask(2, 'Task 2', [1]),
        createSubtask(3, 'Task 3', [2]),
      ];

      const dag = new DirectedAcyclicGraph(subtasks);

      expect(dag.hasCycles()).toBe(false);
    });

    it('should return false for empty graph', () => {
      const dag = new DirectedAcyclicGraph([]);

      expect(dag.hasCycles()).toBe(false);
    });

    it('should return false for disconnected components', () => {
      const subtasks = [
        createSubtask(1, 'Task 1', []),
        createSubtask(2, 'Task 2', []),
        createSubtask(3, 'Task 3', []),
      ];

      const dag = new DirectedAcyclicGraph(subtasks);

      expect(dag.hasCycles()).toBe(false);
    });
  });

  describe('getExecutableNodes', () => {
    it('should return nodes with no dependencies when nothing completed', () => {
      const subtasks = [
        createSubtask(1, 'Task 1', []),
        createSubtask(2, 'Task 2', [1]),
        createSubtask(3, 'Task 3', []),
      ];

      const dag = new DirectedAcyclicGraph(subtasks);
      const executable = dag.getExecutableNodes(new Set());

      expect(executable.map(s => s.id).sort()).toEqual([1, 3]);
    });

    it('should return nodes whose dependencies are satisfied', () => {
      const subtasks = [
        createSubtask(1, 'Task 1', []),
        createSubtask(2, 'Task 2', [1]),
        createSubtask(3, 'Task 3', [1]),
        createSubtask(4, 'Task 4', [2, 3]),
      ];

      const dag = new DirectedAcyclicGraph(subtasks);

      // After completing task 1
      let executable = dag.getExecutableNodes(new Set([1]));
      expect(executable.map(s => s.id).sort()).toEqual([2, 3]);

      // After completing tasks 1, 2, 3
      executable = dag.getExecutableNodes(new Set([1, 2, 3]));
      expect(executable.map(s => s.id)).toEqual([4]);
    });

    it('should return empty array when all nodes completed', () => {
      const subtasks = [
        createSubtask(1, 'Task 1', []),
        createSubtask(2, 'Task 2', [1]),
      ];

      const dag = new DirectedAcyclicGraph(subtasks);
      const executable = dag.getExecutableNodes(new Set([1, 2]));

      expect(executable).toEqual([]);
    });

    it('should handle complex diamond pattern', () => {
      const subtasks = [
        createSubtask(1, 'Root', []),
        createSubtask(2, 'Left', [1]),
        createSubtask(3, 'Right', [1]),
        createSubtask(4, 'Merge', [2, 3]),
      ];

      const dag = new DirectedAcyclicGraph(subtasks);

      // Initially only root is executable
      let executable = dag.getExecutableNodes(new Set());
      expect(executable.map(s => s.id)).toEqual([1]);

      // After root, both branches executable
      executable = dag.getExecutableNodes(new Set([1]));
      expect(executable.map(s => s.id).sort()).toEqual([2, 3]);

      // After one branch, only that's complete
      executable = dag.getExecutableNodes(new Set([1, 2]));
      expect(executable.map(s => s.id)).toEqual([3]);

      // After both branches, merge is executable
      executable = dag.getExecutableNodes(new Set([1, 2, 3]));
      expect(executable.map(s => s.id)).toEqual([4]);
    });
  });

  describe('getDependencies', () => {
    it('should return direct dependencies', () => {
      const subtasks = [
        createSubtask(1, 'Task 1', []),
        createSubtask(2, 'Task 2', [1]),
        createSubtask(3, 'Task 3', [1, 2]),
      ];

      const dag = new DirectedAcyclicGraph(subtasks);

      expect(dag.getDependencies(1)).toEqual([]);
      expect(dag.getDependencies(2)).toEqual([1]);
      expect(dag.getDependencies(3).sort()).toEqual([1, 2]);
    });
  });

  describe('getDependents', () => {
    it('should return direct dependents', () => {
      const subtasks = [
        createSubtask(1, 'Task 1', []),
        createSubtask(2, 'Task 2', [1]),
        createSubtask(3, 'Task 3', [1]),
      ];

      const dag = new DirectedAcyclicGraph(subtasks);

      expect(dag.getDependents(1).sort()).toEqual([2, 3]);
      expect(dag.getDependents(2)).toEqual([]);
      expect(dag.getDependents(3)).toEqual([]);
    });
  });

  describe('performance', () => {
    it('should handle large graphs efficiently', () => {
      // Create graph with 100 nodes
      const subtasks = [createSubtask(1, 'Root', [])];

      for (let i = 2; i <= 100; i++) {
        // Each task depends on previous task
        subtasks.push(createSubtask(i, `Task ${i}`, [i - 1]));
      }

      const start = Date.now();
      const dag = new DirectedAcyclicGraph(subtasks);
      const order = dag.getTopologicalOrder();
      const elapsed = Date.now() - start;

      expect(order.length).toBe(100);
      expect(elapsed).toBeLessThan(100); // Should complete in < 100ms
    });

    it('should handle wide graphs efficiently', () => {
      // Create graph with 1 root and 50 independent children
      const subtasks = [createSubtask(1, 'Root', [])];

      for (let i = 2; i <= 51; i++) {
        subtasks.push(createSubtask(i, `Task ${i}`, [1]));
      }

      const start = Date.now();
      const dag = new DirectedAcyclicGraph(subtasks);
      const executable = dag.getExecutableNodes(new Set([1]));
      const elapsed = Date.now() - start;

      expect(executable.length).toBe(50);
      expect(elapsed).toBeLessThan(50);
    });
  });
});

// Helper function
function createSubtask(
  id: number,
  title: string,
  dependencies: number[]
): Subtask {
  return new Subtask({
    id,
    title,
    prompt: `Prompt for ${title}`,
    commands: [],
    dependencies: Object.freeze(dependencies),
  });
}
```

**Acceptance Criteria**:
- ✅ All tests pass (100+ tests)
- ✅ Cycle detection works for all patterns
- ✅ Topological sort produces valid ordering
- ✅ Performance < 100ms for 100-node graphs
- ✅ getExecutableNodes correctly identifies ready tasks
- ✅ Code coverage > 95%

---

### Task 3: Update Subtask Entity to Support Dependencies (1 day)

**Implementation**:
```typescript
// Modify src/domain/entities/Subtask.ts

export interface SubtaskConstructorParams {
  readonly id: number;
  readonly title: string;
  readonly prompt: string;
  readonly commands: ReadonlyArray<OxtestCommand>;
  readonly dependencies?: ReadonlyArray<number>; // NEW - optional for backward compatibility
}

export class Subtask {
  // ... existing fields
  public readonly dependencies: ReadonlyArray<number>;

  constructor(params: SubtaskConstructorParams) {
    // ... existing validation

    this.dependencies = params.dependencies
      ? Object.freeze([...params.dependencies])
      : Object.freeze([]);

    // Validate dependency IDs are unique
    const depSet = new Set(this.dependencies);
    if (depSet.size !== this.dependencies.length) {
      throw new Error(`Subtask ${params.id}: Duplicate dependencies found`);
    }

    // Validate no self-dependency
    if (this.dependencies.includes(this.id)) {
      throw new Error(`Subtask ${params.id}: Cannot depend on itself`);
    }
  }

  /**
   * Checks if this subtask can execute given completed tasks
   */
  public canExecute(completedTasks: Set<number>): boolean {
    return this.dependencies.every(depId => completedTasks.has(depId));
  }

  // ... rest of existing methods
}
```

**Files to Modify**:
- `src/domain/entities/Subtask.ts`

**Tests to Update**:
- `tests/unit/domain/Subtask.test.ts` - Add tests for dependencies

**Acceptance Criteria**:
- ✅ Subtask accepts optional dependencies array
- ✅ Validates no duplicate dependencies
- ✅ Validates no self-dependencies
- ✅ canExecute() method works correctly
- ✅ Backward compatible (dependencies optional)

---

### Task 4: Integrate DAG into TestOrchestrator (1 day)

**Implementation**:
```typescript
// Modify src/application/orchestrators/TestOrchestrator.ts

import { DirectedAcyclicGraph } from '../../domain/entities/DirectedAcyclicGraph';

export class TestOrchestrator {
  async executeSubtask(subtask: Subtask): Promise<SubtaskResult> {
    // ... existing implementation
  }

  async executeTask(task: Task): Promise<TaskExecutionReport> {
    console.log(`\n🎯 Executing task: ${task.id}`);
    console.log(`   Description: ${task.description}`);
    console.log(`   Subtasks: ${task.subtaskIds.length}`);

    const subtasks = task.subtaskIds.map(id =>
      this.config.subtasks.find(s => s.id === id)!
    );

    // BUILD DAG
    let graph: DirectedAcyclicGraph;
    try {
      graph = new DirectedAcyclicGraph(subtasks);
      console.log(`   📊 Task graph validated (${subtasks.length} nodes, no cycles)`);
    } catch (error) {
      console.error(`   ❌ Task graph validation failed: ${(error as Error).message}`);
      return {
        taskId: task.id,
        success: false,
        subtaskResults: [],
        error: error as Error,
        executionTimeMs: 0,
      };
    }

    // GET EXECUTION ORDER
    const executionOrder = graph.getTopologicalOrder();
    console.log(`   📋 Execution order: ${executionOrder.join(' → ')}`);

    // EXECUTE IN ORDER
    const completed = new Set<number>();
    const subtaskResults = new Map<number, SubtaskResult>();
    const startTime = Date.now();

    for (const subtaskId of executionOrder) {
      const subtask = subtasks.find(s => s.id === subtaskId)!;

      // VERIFY DEPENDENCIES (should always pass with topological order)
      if (!subtask.canExecute(completed)) {
        // This should never happen with valid topological sort
        console.error(`   ⚠️  Subtask ${subtaskId} cannot execute (dependencies not met)`);
        subtaskResults.set(subtaskId, {
          subtaskId,
          success: false,
          error: new Error('Dependencies not satisfied'),
          executionTimeMs: 0,
        });
        continue;
      }

      // EXECUTE SUBTASK
      console.log(`   ▶️  Executing subtask ${subtaskId}: ${subtask.title}`);
      const result = await this.executeSubtask(subtask);
      subtaskResults.set(subtaskId, result);

      if (result.success) {
        completed.add(subtaskId);
        console.log(`   ✅ Subtask ${subtaskId} completed`);
      } else {
        console.error(`   ❌ Subtask ${subtaskId} failed: ${result.error?.message}`);

        // TODO: In future sprint, handle failure strategies
        // For now, continue execution (fail-fast vs continue)
        // This depends on task configuration
      }
    }

    const executionTimeMs = Date.now() - startTime;
    const allSuccess = Array.from(subtaskResults.values()).every(r => r.success);

    return {
      taskId: task.id,
      success: allSuccess,
      subtaskResults: Array.from(subtaskResults.values()),
      executionTimeMs,
      executionOrder, // NEW - include order in report
      graph: {
        nodes: subtasks.length,
        edges: graph.edges.length,
      },
    };
  }
}
```

**Files to Modify**:
- `src/application/orchestrators/TestOrchestrator.ts`

**Tests to Update**:
- `tests/unit/application/orchestrators/TestOrchestrator.test.ts`

**Acceptance Criteria**:
- ✅ Uses DAG for execution order
- ✅ Validates graph on task start
- ✅ Logs execution order
- ✅ Includes graph info in report
- ✅ All existing tests still pass

---

## 🧪 Testing Strategy

### Unit Tests
- **DirectedAcyclicGraph**: 50+ tests covering all methods
- **Subtask**: 10+ tests for new dependency features
- **TestOrchestrator**: 15+ tests for DAG integration

### Integration Tests
- End-to-end task execution with dependencies
- Complex dependency patterns (diamond, fan-in, fan-out)
- Error scenarios (cycles, missing dependencies)

### Performance Tests
- Large graphs (100+ nodes)
- Wide graphs (1→50 children)
- Deep graphs (50-level chains)
- Target: < 100ms for 100-node graphs

---

## 📊 Success Metrics

- ✅ 100+ new tests passing
- ✅ Code coverage > 95%
- ✅ No regression in existing tests
- ✅ DAG handles 100+ nodes in < 100ms
- ✅ Cycle detection catches all patterns
- ✅ Architecture alignment: 85% → 90%

---

## 🚀 Sprint Deliverables

1. **Code**:
   - ITaskGraph interface
   - DirectedAcyclicGraph implementation
   - Enhanced Subtask entity
   - Updated TestOrchestrator

2. **Tests**:
   - 100+ unit tests
   - 10+ integration tests
   - Performance benchmarks

3. **Documentation**:
   - JSDoc for all new code
   - Architecture diagram update
   - Usage examples

---

## ⚠️ Risks and Mitigation

### Risk 1: Breaking Changes in Subtask
**Impact**: HIGH
**Mitigation**:
- Make dependencies optional (backward compatible)
- Update all test fixtures
- Provide migration guide

### Risk 2: Performance Issues with Large Graphs
**Impact**: MEDIUM
**Mitigation**:
- Profile early
- Optimize adjacency list operations
- Add performance tests in CI

### Risk 3: Complex Cycle Detection Edge Cases
**Impact**: LOW
**Mitigation**:
- Comprehensive test coverage
- Use well-known DFS algorithm
- Add validation during construction

---

## 📝 Definition of Done

- [ ] All code implemented and reviewed
- [ ] All tests written and passing (100+ tests)
- [ ] Code coverage > 95%
- [ ] Performance benchmarks met
- [ ] Documentation complete
- [ ] No linting errors
- [ ] Integration tests pass
- [ ] Sprint review completed
- [ ] Code merged to main branch

---

## 🔗 Related Sprints

- **Sprint 16**: Will use DAG for parallel execution
- **Sprint 17-19**: Will build on enhanced Subtask entity

---

**Sprint Owner**: TBD
**Reviewers**: TBD
**Start Date**: TBD
**Target End Date**: TBD
