/**
 * Unit tests for GraphNode
 * Sprint 15: Task Graph/DAG Implementation
 *
 * Tests node representation in DAG
 */

import { GraphNode } from '../../../src/domain/graph/GraphNode';

describe('GraphNode', () => {
  describe('constructor', () => {
    it('should create node with id and data', () => {
      const node = new GraphNode('node1', 'test-value');

      expect(node.getId()).toBe('node1');
      expect(node.getData()).toBe('test-value');
    });

    it('should initialize with empty dependencies', () => {
      const node = new GraphNode('node1', 'value');

      expect(node.getIncomingEdges()).toEqual([]);
      expect(node.getOutgoingEdges()).toEqual([]);
    });
  });

  describe('addIncomingEdge', () => {
    it('should add incoming edge', () => {
      const node = new GraphNode('node1', 'value');

      node.addIncomingEdge('node0');

      expect(node.getIncomingEdges()).toEqual(['node0']);
      expect(node.hasIncomingEdge('node0')).toBe(true);
    });

    it('should not add duplicate incoming edge', () => {
      const node = new GraphNode('node1', 'value');

      node.addIncomingEdge('node0');
      node.addIncomingEdge('node0');

      expect(node.getIncomingEdges()).toEqual(['node0']);
    });
  });

  describe('addOutgoingEdge', () => {
    it('should add outgoing edge', () => {
      const node = new GraphNode('node1', 'value');

      node.addOutgoingEdge('node2');

      expect(node.getOutgoingEdges()).toEqual(['node2']);
      expect(node.hasOutgoingEdge('node2')).toBe(true);
    });

    it('should not add duplicate outgoing edge', () => {
      const node = new GraphNode('node1', 'value');

      node.addOutgoingEdge('node2');
      node.addOutgoingEdge('node2');

      expect(node.getOutgoingEdges()).toEqual(['node2']);
    });
  });

  describe('getInDegree', () => {
    it('should return 0 for node with no incoming edges', () => {
      const node = new GraphNode('node1', 'value');

      expect(node.getInDegree()).toBe(0);
    });

    it('should return count of incoming edges', () => {
      const node = new GraphNode('node1', 'value');

      node.addIncomingEdge('node0');
      node.addIncomingEdge('node-1');

      expect(node.getInDegree()).toBe(2);
    });
  });

  describe('getOutDegree', () => {
    it('should return 0 for node with no outgoing edges', () => {
      const node = new GraphNode('node1', 'value');

      expect(node.getOutDegree()).toBe(0);
    });

    it('should return count of outgoing edges', () => {
      const node = new GraphNode('node1', 'value');

      node.addOutgoingEdge('node2');
      node.addOutgoingEdge('node3');

      expect(node.getOutDegree()).toBe(2);
    });
  });

  describe('isRoot', () => {
    it('should return true for node with no incoming edges', () => {
      const node = new GraphNode('node1', 'value');

      expect(node.isRoot()).toBe(true);
    });

    it('should return false for node with incoming edges', () => {
      const node = new GraphNode('node1', 'value');
      node.addIncomingEdge('node0');

      expect(node.isRoot()).toBe(false);
    });
  });

  describe('isLeaf', () => {
    it('should return true for node with no outgoing edges', () => {
      const node = new GraphNode('node1', 'value');

      expect(node.isLeaf()).toBe(true);
    });

    it('should return false for node with outgoing edges', () => {
      const node = new GraphNode('node1', 'value');
      node.addOutgoingEdge('node2');

      expect(node.isLeaf()).toBe(false);
    });
  });
});
