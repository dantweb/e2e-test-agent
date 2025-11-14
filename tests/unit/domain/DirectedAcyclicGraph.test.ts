/**
 * Unit tests for DirectedAcyclicGraph (DAG)
 * Sprint 15: Task Graph/DAG Implementation
 *
 * Tests Kahn's algorithm for topological sort and cycle detection
 */

import { DirectedAcyclicGraph } from '../../../src/domain/graph/DirectedAcyclicGraph';

describe('DirectedAcyclicGraph', () => {
  describe('constructor', () => {
    it('should create empty DAG', () => {
      const dag = new DirectedAcyclicGraph<string>();

      expect(dag.isEmpty()).toBe(true);
      expect(dag.size()).toBe(0);
    });
  });

  describe('addNode', () => {
    it('should add node to DAG', () => {
      const dag = new DirectedAcyclicGraph<string>();

      dag.addNode('node1', 'value1');

      expect(dag.size()).toBe(1);
      expect(dag.hasNode('node1')).toBe(true);
      expect(dag.isEmpty()).toBe(false);
    });

    it('should throw error when adding duplicate node', () => {
      const dag = new DirectedAcyclicGraph<string>();
      dag.addNode('node1', 'value1');

      expect(() => {
        dag.addNode('node1', 'value2');
      }).toThrow('Node node1 already exists in graph');
    });

    it('should store node data correctly', () => {
      const dag = new DirectedAcyclicGraph<string>();

      dag.addNode('node1', 'test-value');

      const node = dag.getNode('node1');
      expect(node).toBeDefined();
      expect(node?.getData()).toBe('test-value');
    });
  });

  describe('addEdge', () => {
    it('should add edge between two nodes', () => {
      const dag = new DirectedAcyclicGraph<string>();
      dag.addNode('node1', 'value1');
      dag.addNode('node2', 'value2');

      dag.addEdge('node1', 'node2');

      const node1 = dag.getNode('node1');
      expect(node1?.hasOutgoingEdge('node2')).toBe(true);
    });

    it('should throw error when adding edge with non-existent source', () => {
      const dag = new DirectedAcyclicGraph<string>();
      dag.addNode('node2', 'value2');

      expect(() => {
        dag.addEdge('node1', 'node2');
      }).toThrow('Node node1 does not exist');
    });

    it('should throw error when adding edge with non-existent target', () => {
      const dag = new DirectedAcyclicGraph<string>();
      dag.addNode('node1', 'value1');

      expect(() => {
        dag.addEdge('node1', 'node2');
      }).toThrow('Node node2 does not exist');
    });

    it('should throw error when edge creates cycle', () => {
      const dag = new DirectedAcyclicGraph<string>();
      dag.addNode('node1', 'value1');
      dag.addNode('node2', 'value2');
      dag.addEdge('node1', 'node2');

      expect(() => {
        dag.addEdge('node2', 'node1'); // Creates cycle
      }).toThrow('Adding edge would create cycle');
    });

    it('should detect self-loop as cycle', () => {
      const dag = new DirectedAcyclicGraph<string>();
      dag.addNode('node1', 'value1');

      expect(() => {
        dag.addEdge('node1', 'node1'); // Self-loop
      }).toThrow('Adding edge would create cycle');
    });
  });

  describe('topologicalSort', () => {
    it('should return empty array for empty graph', () => {
      const dag = new DirectedAcyclicGraph<string>();

      const sorted = dag.topologicalSort();

      expect(sorted).toEqual([]);
    });

    it('should return single node for graph with one node', () => {
      const dag = new DirectedAcyclicGraph<string>();
      dag.addNode('node1', 'value1');

      const sorted = dag.topologicalSort();

      expect(sorted).toEqual(['node1']);
    });

    it('should sort linear chain correctly', () => {
      const dag = new DirectedAcyclicGraph<string>();
      dag.addNode('node1', 'value1');
      dag.addNode('node2', 'value2');
      dag.addNode('node3', 'value3');
      dag.addEdge('node1', 'node2');
      dag.addEdge('node2', 'node3');

      const sorted = dag.topologicalSort();

      expect(sorted).toEqual(['node1', 'node2', 'node3']);
    });

    it('should sort diamond dependency correctly', () => {
      const dag = new DirectedAcyclicGraph<string>();
      dag.addNode('A', 'valueA');
      dag.addNode('B', 'valueB');
      dag.addNode('C', 'valueC');
      dag.addNode('D', 'valueD');

      // Diamond: A -> B, A -> C, B -> D, C -> D
      dag.addEdge('A', 'B');
      dag.addEdge('A', 'C');
      dag.addEdge('B', 'D');
      dag.addEdge('C', 'D');

      const sorted = dag.topologicalSort();

      // A must come first, D must come last, B and C can be in any order
      expect(sorted[0]).toBe('A');
      expect(sorted[3]).toBe('D');
      expect(sorted).toContain('B');
      expect(sorted).toContain('C');
    });

    it('should sort complex DAG correctly', () => {
      const dag = new DirectedAcyclicGraph<string>();

      // Build a more complex DAG
      ['A', 'B', 'C', 'D', 'E', 'F'].forEach(id => {
        dag.addNode(id, `value${id}`);
      });

      dag.addEdge('A', 'C');
      dag.addEdge('B', 'C');
      dag.addEdge('B', 'D');
      dag.addEdge('C', 'E');
      dag.addEdge('D', 'E');
      dag.addEdge('E', 'F');

      const sorted = dag.topologicalSort();

      // Verify all prerequisites come before dependents
      const indexA = sorted.indexOf('A');
      const indexB = sorted.indexOf('B');
      const indexC = sorted.indexOf('C');
      const indexD = sorted.indexOf('D');
      const indexE = sorted.indexOf('E');
      const indexF = sorted.indexOf('F');

      expect(indexA).toBeLessThan(indexC);
      expect(indexB).toBeLessThan(indexC);
      expect(indexB).toBeLessThan(indexD);
      expect(indexC).toBeLessThan(indexE);
      expect(indexD).toBeLessThan(indexE);
      expect(indexE).toBeLessThan(indexF);
    });
  });

  describe('getExecutableNodes', () => {
    it('should return all nodes when none have dependencies', () => {
      const dag = new DirectedAcyclicGraph<string>();
      dag.addNode('node1', 'value1');
      dag.addNode('node2', 'value2');
      dag.addNode('node3', 'value3');

      const executable = dag.getExecutableNodes(new Set());

      expect(executable.sort()).toEqual(['node1', 'node2', 'node3'].sort());
    });

    it('should return only root nodes initially', () => {
      const dag = new DirectedAcyclicGraph<string>();
      dag.addNode('node1', 'value1');
      dag.addNode('node2', 'value2');
      dag.addNode('node3', 'value3');
      dag.addEdge('node1', 'node2');
      dag.addEdge('node2', 'node3');

      const executable = dag.getExecutableNodes(new Set());

      expect(executable).toEqual(['node1']);
    });

    it('should return next executable nodes after completion', () => {
      const dag = new DirectedAcyclicGraph<string>();
      dag.addNode('node1', 'value1');
      dag.addNode('node2', 'value2');
      dag.addNode('node3', 'value3');
      dag.addEdge('node1', 'node2');
      dag.addEdge('node2', 'node3');

      const completed = new Set<string>(['node1']);
      const executable = dag.getExecutableNodes(completed);

      expect(executable).toEqual(['node2']);
    });

    it('should handle diamond dependency execution', () => {
      const dag = new DirectedAcyclicGraph<string>();
      dag.addNode('A', 'valueA');
      dag.addNode('B', 'valueB');
      dag.addNode('C', 'valueC');
      dag.addNode('D', 'valueD');

      dag.addEdge('A', 'B');
      dag.addEdge('A', 'C');
      dag.addEdge('B', 'D');
      dag.addEdge('C', 'D');

      // Initially, only A is executable
      let executable = dag.getExecutableNodes(new Set());
      expect(executable).toEqual(['A']);

      // After A completes, B and C are executable
      executable = dag.getExecutableNodes(new Set(['A']));
      expect(executable.sort()).toEqual(['B', 'C']);

      // After B completes, C is still executable (only depends on A)
      executable = dag.getExecutableNodes(new Set(['A', 'B']));
      expect(executable).toEqual(['C']);

      // After both B and C complete, D is executable
      executable = dag.getExecutableNodes(new Set(['A', 'B', 'C']));
      expect(executable).toEqual(['D']);
    });
  });

  describe('hasCycle', () => {
    it('should return false for empty graph', () => {
      const dag = new DirectedAcyclicGraph<string>();

      expect(dag.hasCycle()).toBe(false);
    });

    it('should return false for single node', () => {
      const dag = new DirectedAcyclicGraph<string>();
      dag.addNode('node1', 'value1');

      expect(dag.hasCycle()).toBe(false);
    });

    it('should return false for linear chain', () => {
      const dag = new DirectedAcyclicGraph<string>();
      dag.addNode('node1', 'value1');
      dag.addNode('node2', 'value2');
      dag.addNode('node3', 'value3');
      dag.addEdge('node1', 'node2');
      dag.addEdge('node2', 'node3');

      expect(dag.hasCycle()).toBe(false);
    });

    it('should return false for diamond structure', () => {
      const dag = new DirectedAcyclicGraph<string>();
      dag.addNode('A', 'valueA');
      dag.addNode('B', 'valueB');
      dag.addNode('C', 'valueC');
      dag.addNode('D', 'valueD');
      dag.addEdge('A', 'B');
      dag.addEdge('A', 'C');
      dag.addEdge('B', 'D');
      dag.addEdge('C', 'D');

      expect(dag.hasCycle()).toBe(false);
    });
  });

  describe('getDependencies', () => {
    it('should return empty array for node with no dependencies', () => {
      const dag = new DirectedAcyclicGraph<string>();
      dag.addNode('node1', 'value1');

      const deps = dag.getDependencies('node1');

      expect(deps).toEqual([]);
    });

    it('should return direct dependencies', () => {
      const dag = new DirectedAcyclicGraph<string>();
      dag.addNode('node1', 'value1');
      dag.addNode('node2', 'value2');
      dag.addNode('node3', 'value3');
      dag.addEdge('node1', 'node3');
      dag.addEdge('node2', 'node3');

      const deps = dag.getDependencies('node3');

      expect(deps.sort()).toEqual(['node1', 'node2']);
    });

    it('should throw error for non-existent node', () => {
      const dag = new DirectedAcyclicGraph<string>();

      expect(() => {
        dag.getDependencies('nonexistent');
      }).toThrow('Node nonexistent does not exist');
    });
  });

  describe('getDependents', () => {
    it('should return empty array for node with no dependents', () => {
      const dag = new DirectedAcyclicGraph<string>();
      dag.addNode('node1', 'value1');

      const deps = dag.getDependents('node1');

      expect(deps).toEqual([]);
    });

    it('should return direct dependents', () => {
      const dag = new DirectedAcyclicGraph<string>();
      dag.addNode('node1', 'value1');
      dag.addNode('node2', 'value2');
      dag.addNode('node3', 'value3');
      dag.addEdge('node1', 'node2');
      dag.addEdge('node1', 'node3');

      const deps = dag.getDependents('node1');

      expect(deps.sort()).toEqual(['node2', 'node3']);
    });
  });
});
