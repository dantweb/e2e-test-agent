/**
 * TaskDecomposer with TaskGraph Integration Tests
 *
 * Sprint 6: Test TaskGraph integration for dependency-aware task decomposition
 *
 * These tests verify that TaskDecomposer can:
 * 1. Build TaskGraphs from subtask dependencies
 * 2. Detect cycles in subtask dependencies
 * 3. Order subtasks based on dependencies
 * 4. Handle complex dependency chains
 */

import { TaskDecomposer } from '../../../../src/application/engines/TaskDecomposer';
import { IterativeDecompositionEngine } from '../../../../src/application/engines/IterativeDecompositionEngine';
import { Task } from '../../../../src/domain/entities/Task';
import { Subtask } from '../../../../src/domain/entities/Subtask';
import { OxtestCommand } from '../../../../src/domain/entities/OxtestCommand';
import { SelectorSpec } from '../../../../src/domain/entities/SelectorSpec';
import { DirectedAcyclicGraph } from '../../../../src/domain/graph/DirectedAcyclicGraph';

describe('TaskDecomposer - TaskGraph Integration (Sprint 6)', () => {
  let mockDecompositionEngine: jest.Mocked<IterativeDecompositionEngine>;
  let decomposer: TaskDecomposer;

  beforeEach(() => {
    mockDecompositionEngine = {
      decompose: jest.fn(),
    } as any;

    decomposer = new TaskDecomposer(mockDecompositionEngine);
  });

  describe('buildTaskGraph', () => {
    it('should build a TaskGraph from subtasks without dependencies', () => {
      const subtasks = [
        new Subtask('sub-1', 'Step 1', [
          new OxtestCommand('navigate', { url: 'https://example.com' }),
        ]),
        new Subtask('sub-2', 'Step 2', [
          new OxtestCommand('click', {}, new SelectorSpec('css', '#button')),
        ]),
        new Subtask('sub-3', 'Step 3', [new OxtestCommand('wait', { duration: 1000 })]),
      ];

      const graph = decomposer.buildTaskGraph(subtasks);

      expect(graph).toBeInstanceOf(DirectedAcyclicGraph);
      expect(graph.size()).toBe(3);
      expect(graph.hasNode('sub-1')).toBe(true);
      expect(graph.hasNode('sub-2')).toBe(true);
      expect(graph.hasNode('sub-3')).toBe(true);
    });

    it('should build a TaskGraph with linear dependencies', () => {
      // Create subtasks: sub-1 -> sub-2 -> sub-3
      const subtasks = [
        new Subtask('sub-1', 'Step 1', [
          new OxtestCommand('navigate', { url: 'https://example.com' }),
        ]),
        new Subtask('sub-2', 'Step 2', [
          new OxtestCommand('click', {}, new SelectorSpec('css', '#button')),
        ]),
        new Subtask('sub-3', 'Step 3', [new OxtestCommand('wait', { duration: 1000 })]),
      ];

      const dependencies = new Map<string, string[]>([
        ['sub-2', ['sub-1']], // sub-2 depends on sub-1
        ['sub-3', ['sub-2']], // sub-3 depends on sub-2
      ]);

      const graph = decomposer.buildTaskGraph(subtasks, dependencies);

      expect(graph.size()).toBe(3);
      expect(graph.getDependencies('sub-2')).toEqual(['sub-1']);
      expect(graph.getDependencies('sub-3')).toEqual(['sub-2']);
      expect(graph.getDependencies('sub-1')).toEqual([]);
    });

    it('should build a TaskGraph with parallel branches', () => {
      // Create subtasks: sub-1 -> [sub-2, sub-3] -> sub-4
      // Both sub-2 and sub-3 can run in parallel after sub-1
      const subtasks = [
        new Subtask('sub-1', 'Step 1', [
          new OxtestCommand('navigate', { url: 'https://example.com' }),
        ]),
        new Subtask('sub-2', 'Step 2a', [
          new OxtestCommand('click', {}, new SelectorSpec('css', '#button-a')),
        ]),
        new Subtask('sub-3', 'Step 2b', [
          new OxtestCommand('click', {}, new SelectorSpec('css', '#other')),
        ]),
        new Subtask('sub-4', 'Step 3', [new OxtestCommand('wait', { duration: 1000 })]),
      ];

      const dependencies = new Map<string, string[]>([
        ['sub-2', ['sub-1']],
        ['sub-3', ['sub-1']],
        ['sub-4', ['sub-2', 'sub-3']],
      ]);

      const graph = decomposer.buildTaskGraph(subtasks, dependencies);

      expect(graph.size()).toBe(4);
      expect(graph.getDependencies('sub-2')).toEqual(['sub-1']);
      expect(graph.getDependencies('sub-3')).toEqual(['sub-1']);
      expect(graph.getDependencies('sub-4')).toContain('sub-2');
      expect(graph.getDependencies('sub-4')).toContain('sub-3');
    });

    it('should detect cycle in dependencies', () => {
      const subtasks = [
        new Subtask('sub-1', 'Step 1', [
          new OxtestCommand('navigate', { url: 'https://example.com' }),
        ]),
        new Subtask('sub-2', 'Step 2', [
          new OxtestCommand('click', {}, new SelectorSpec('css', '#button')),
        ]),
        new Subtask('sub-3', 'Step 3', [new OxtestCommand('wait', { duration: 1000 })]),
      ];

      // Create cycle: sub-1 -> sub-2 -> sub-3 -> sub-1
      const dependencies = new Map<string, string[]>([
        ['sub-2', ['sub-1']],
        ['sub-3', ['sub-2']],
        ['sub-1', ['sub-3']], // Creates cycle
      ]);

      expect(() => decomposer.buildTaskGraph(subtasks, dependencies)).toThrow(/cycle/i);
    });

    it('should detect self-dependency', () => {
      const subtasks = [
        new Subtask('sub-1', 'Step 1', [
          new OxtestCommand('navigate', { url: 'https://example.com' }),
        ]),
      ];

      const dependencies = new Map<string, string[]>([
        ['sub-1', ['sub-1']], // Self-dependency
      ]);

      expect(() => decomposer.buildTaskGraph(subtasks, dependencies)).toThrow(/cycle/i);
    });

    it('should handle complex diamond dependency', () => {
      // Diamond: sub-1 -> [sub-2, sub-3] -> sub-4
      //          Also: sub-2 -> sub-5 -> sub-4
      const subtasks = [
        new Subtask('sub-1', 'Step 1', [
          new OxtestCommand('navigate', { url: 'https://example.com' }),
        ]),
        new Subtask('sub-2', 'Step 2', [
          new OxtestCommand('click', {}, new SelectorSpec('css', '#button')),
        ]),
        new Subtask('sub-3', 'Step 3', [
          new OxtestCommand('click', {}, new SelectorSpec('css', '#button-3')),
        ]),
        new Subtask('sub-4', 'Step 4', [new OxtestCommand('wait', { duration: 100 })]),
        new Subtask('sub-5', 'Step 5', [new OxtestCommand('wait', { duration: 200 })]),
      ];

      const dependencies = new Map<string, string[]>([
        ['sub-2', ['sub-1']],
        ['sub-3', ['sub-1']],
        ['sub-5', ['sub-2']],
        ['sub-4', ['sub-3', 'sub-5']],
      ]);

      const graph = decomposer.buildTaskGraph(subtasks, dependencies);

      expect(graph.size()).toBe(5);
      expect(graph.hasCycle()).toBe(false);
      expect(graph.getDependencies('sub-4')).toContain('sub-3');
      expect(graph.getDependencies('sub-4')).toContain('sub-5');
    });

    it('should throw error for non-existent dependency', () => {
      const subtasks = [
        new Subtask('sub-1', 'Step 1', [
          new OxtestCommand('navigate', { url: 'https://example.com' }),
        ]),
      ];

      const dependencies = new Map<string, string[]>([['sub-1', ['non-existent']]]);

      expect(() => decomposer.buildTaskGraph(subtasks, dependencies)).toThrow(/does not exist/i);
    });
  });

  describe('getTopologicalOrder', () => {
    it('should return correct topological order for linear dependencies', () => {
      const subtasks = [
        new Subtask('sub-3', 'Step 3', [new OxtestCommand('wait', { duration: 1000 })]),
        new Subtask('sub-1', 'Step 1', [
          new OxtestCommand('navigate', { url: 'https://example.com' }),
        ]),
        new Subtask('sub-2', 'Step 2', [
          new OxtestCommand('click', {}, new SelectorSpec('css', '#button')),
        ]),
      ];

      const dependencies = new Map<string, string[]>([
        ['sub-2', ['sub-1']],
        ['sub-3', ['sub-2']],
      ]);

      const graph = decomposer.buildTaskGraph(subtasks, dependencies);
      const order = graph.topologicalSort();

      expect(order).toEqual(['sub-1', 'sub-2', 'sub-3']);
    });

    it('should return valid topological order for parallel branches', () => {
      const subtasks = [
        new Subtask('sub-1', 'Step 1', [
          new OxtestCommand('navigate', { url: 'https://example.com' }),
        ]),
        new Subtask('sub-2', 'Step 2a', [
          new OxtestCommand('click', {}, new SelectorSpec('css', '#button-2a')),
        ]),
        new Subtask('sub-3', 'Step 2b', [
          new OxtestCommand('click', {}, new SelectorSpec('css', '#other')),
        ]),
        new Subtask('sub-4', 'Step 3', [new OxtestCommand('wait', { duration: 1000 })]),
      ];

      const dependencies = new Map<string, string[]>([
        ['sub-2', ['sub-1']],
        ['sub-3', ['sub-1']],
        ['sub-4', ['sub-2', 'sub-3']],
      ]);

      const graph = decomposer.buildTaskGraph(subtasks, dependencies);
      const order = graph.topologicalSort();

      // sub-1 must be first
      expect(order[0]).toBe('sub-1');

      // sub-2 and sub-3 can be in any order (parallel)
      expect(order[1]).toMatch(/sub-[23]/);
      expect(order[2]).toMatch(/sub-[23]/);
      expect(order[1]).not.toBe(order[2]);

      // sub-4 must be last
      expect(order[3]).toBe('sub-4');
    });

    it('should handle independent subtasks', () => {
      const subtasks = [
        new Subtask('sub-1', 'Step 1', [
          new OxtestCommand('navigate', { url: 'https://example.com' }),
        ]),
        new Subtask('sub-2', 'Step 2', [
          new OxtestCommand('click', {}, new SelectorSpec('css', '#button')),
        ]),
        new Subtask('sub-3', 'Step 3', [new OxtestCommand('wait', { duration: 1000 })]),
      ];

      const graph = decomposer.buildTaskGraph(subtasks);
      const order = graph.topologicalSort();

      // All are independent, so any order is valid
      expect(order).toHaveLength(3);
      expect(order).toContain('sub-1');
      expect(order).toContain('sub-2');
      expect(order).toContain('sub-3');
    });
  });

  describe('decomposeTaskWithDependencies', () => {
    it('should decompose task with dependency-aware ordering', async () => {
      const task = new Task('task-1', 'Complete checkout flow', []);

      const steps = ['Navigate to product page', 'Add item to cart', 'Go to checkout'];

      // Mock decomposition engine
      mockDecompositionEngine.decompose
        .mockResolvedValueOnce(
          new Subtask('sub-1', 'Navigate to product page', [
            new OxtestCommand('navigate', { url: 'https://shop.com/product' }),
          ])
        )
        .mockResolvedValueOnce(
          new Subtask('sub-2', 'Add item to cart', [
            new OxtestCommand('click', {}, new SelectorSpec('css', '.add-to-cart')),
          ])
        )
        .mockResolvedValueOnce(
          new Subtask('sub-3', 'Go to checkout', [
            new OxtestCommand('navigate', { url: 'https://shop.com/checkout' }),
          ])
        );

      // Define dependencies: linear flow
      const dependencies = new Map<string, string[]>([
        ['sub-2', ['sub-1']],
        ['sub-3', ['sub-2']],
      ]);

      const result = await decomposer.decomposeTaskWithDependencies(task, steps, dependencies);

      expect(result.subtasks).toHaveLength(3);
      expect(result.graph).toBeDefined();
      expect(result.graph.size()).toBe(3);

      const order = result.graph.topologicalSort();
      expect(order).toEqual(['sub-1', 'sub-2', 'sub-3']);
    });

    it('should handle parallel steps in decomposition', async () => {
      const task = new Task('task-1', 'Setup environment', []);

      const steps = [
        'Login as admin',
        'Create test data A',
        'Create test data B',
        'Verify setup complete',
      ];

      mockDecompositionEngine.decompose
        .mockResolvedValueOnce(
          new Subtask('sub-1', 'Login', [
            new OxtestCommand('navigate', { url: 'https://example.com/login' }),
          ])
        )
        .mockResolvedValueOnce(
          new Subtask('sub-2', 'Create A', [
            new OxtestCommand('click', {}, new SelectorSpec('css', '#create-a')),
          ])
        )
        .mockResolvedValueOnce(
          new Subtask('sub-3', 'Create B', [
            new OxtestCommand('click', {}, new SelectorSpec('css', '#create-b')),
          ])
        )
        .mockResolvedValueOnce(
          new Subtask('sub-4', 'Verify', [new OxtestCommand('wait', { duration: 100 })])
        );

      // sub-2 and sub-3 can run in parallel after sub-1
      const dependencies = new Map<string, string[]>([
        ['sub-2', ['sub-1']],
        ['sub-3', ['sub-1']],
        ['sub-4', ['sub-2', 'sub-3']],
      ]);

      const result = await decomposer.decomposeTaskWithDependencies(task, steps, dependencies);

      expect(result.subtasks).toHaveLength(4);
      expect(result.graph.getDependencies('sub-4')).toContain('sub-2');
      expect(result.graph.getDependencies('sub-4')).toContain('sub-3');
    });

    it('should throw error if decomposition creates cyclic dependencies', async () => {
      const task = new Task('task-1', 'Invalid flow', []);
      const steps = ['Step 1', 'Step 2', 'Step 3'];

      mockDecompositionEngine.decompose
        .mockResolvedValueOnce(
          new Subtask('sub-1', 'Step 1', [new OxtestCommand('wait', { duration: 100 })])
        )
        .mockResolvedValueOnce(
          new Subtask('sub-2', 'Step 2', [new OxtestCommand('wait', { duration: 100 })])
        )
        .mockResolvedValueOnce(
          new Subtask('sub-3', 'Step 3', [new OxtestCommand('wait', { duration: 100 })])
        );

      // Create cycle
      const dependencies = new Map<string, string[]>([
        ['sub-2', ['sub-1']],
        ['sub-3', ['sub-2']],
        ['sub-1', ['sub-3']],
      ]);

      await expect(
        decomposer.decomposeTaskWithDependencies(task, steps, dependencies)
      ).rejects.toThrow(/cycle/i);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty subtask list', () => {
      const graph = decomposer.buildTaskGraph([]);

      expect(graph.size()).toBe(0);
      expect(graph.isEmpty()).toBe(true);
      expect(graph.topologicalSort()).toEqual([]);
    });

    it('should handle single subtask', () => {
      const subtasks = [
        new Subtask('sub-1', 'Only step', [
          new OxtestCommand('navigate', { url: 'https://example.com' }),
        ]),
      ];

      const graph = decomposer.buildTaskGraph(subtasks);

      expect(graph.size()).toBe(1);
      expect(graph.topologicalSort()).toEqual(['sub-1']);
      expect(graph.getDependencies('sub-1')).toEqual([]);
    });

    it('should handle dependencies with empty array', () => {
      const subtasks = [
        new Subtask('sub-1', 'Step 1', [
          new OxtestCommand('navigate', { url: 'https://example.com' }),
        ]),
      ];

      const dependencies = new Map<string, string[]>([['sub-1', []]]);

      const graph = decomposer.buildTaskGraph(subtasks, dependencies);

      expect(graph.getDependencies('sub-1')).toEqual([]);
    });
  });
});
