/**
 * DirectedAcyclicGraph - Implementation of a DAG for task dependencies
 *
 * Part of Sprint 15: Task Graph/DAG Implementation
 *
 * Implements Kahn's algorithm for topological sorting and DFS for cycle detection.
 * Used to manage task dependencies and determine execution order.
 */

import { ITaskGraph } from '../interfaces/ITaskGraph';
import { GraphNode } from './GraphNode';

export class DirectedAcyclicGraph<T> implements ITaskGraph<T> {
  private readonly nodes: Map<string, GraphNode<T>>;

  constructor() {
    this.nodes = new Map();
  }

  /**
   * Adds a node to the graph
   *
   * @param id - Unique identifier for the node
   * @param data - Data payload for the node
   * @throws Error if node with this ID already exists
   */
  addNode(id: string, data: T): void {
    if (this.nodes.has(id)) {
      throw new Error(`Node ${id} already exists in graph`);
    }
    this.nodes.set(id, new GraphNode(id, data));
  }

  /**
   * Gets a node by ID
   *
   * @param id - Node identifier
   * @returns GraphNode if found, undefined otherwise
   */
  getNode(id: string): GraphNode<T> | undefined {
    return this.nodes.get(id);
  }

  /**
   * Checks if node exists in graph
   *
   * @param id - Node identifier to check
   */
  hasNode(id: string): boolean {
    return this.nodes.has(id);
  }

  /**
   * Adds a directed edge from one node to another
   *
   * @param fromId - Source node ID
   * @param toId - Target node ID
   * @throws Error if either node doesn't exist or if edge would create a cycle
   */
  addEdge(fromId: string, toId: string): void {
    const fromNode = this.nodes.get(fromId);
    const toNode = this.nodes.get(toId);

    if (!fromNode) {
      throw new Error(`Node ${fromId} does not exist`);
    }
    if (!toNode) {
      throw new Error(`Node ${toId} does not exist`);
    }

    // Check if adding edge would create cycle
    if (this.wouldCreateCycle(fromId, toId)) {
      throw new Error('Adding edge would create cycle');
    }

    fromNode.addOutgoingEdge(toId);
    toNode.addIncomingEdge(fromId);
  }

  /**
   * Returns nodes in topological order using Kahn's algorithm
   *
   * Time Complexity: O(V + E) where V = vertices, E = edges
   * Space Complexity: O(V)
   *
   * @returns Array of node IDs in execution order
   */
  topologicalSort(): string[] {
    if (this.isEmpty()) {
      return [];
    }

    const sorted: string[] = [];
    const inDegree = new Map<string, number>();
    const queue: string[] = [];

    // Initialize in-degrees
    for (const [id, node] of this.nodes) {
      inDegree.set(id, node.getInDegree());
      if (node.getInDegree() === 0) {
        queue.push(id);
      }
    }

    // Process queue (Kahn's algorithm)
    while (queue.length > 0) {
      const nodeId = queue.shift()!;
      sorted.push(nodeId);

      const node = this.nodes.get(nodeId)!;
      for (const outgoingId of node.getOutgoingEdges()) {
        const degree = inDegree.get(outgoingId)! - 1;
        inDegree.set(outgoingId, degree);
        if (degree === 0) {
          queue.push(outgoingId);
        }
      }
    }

    return sorted;
  }

  /**
   * Returns nodes that can be executed given a set of completed nodes
   *
   * A node is executable if:
   * 1. It has not been completed yet
   * 2. All its dependencies have been completed
   *
   * @param completed - Set of completed node IDs
   * @returns Array of node IDs that are ready to execute
   */
  getExecutableNodes(completed: Set<string>): string[] {
    const executable: string[] = [];

    for (const [id, node] of this.nodes) {
      // Skip if already completed
      if (completed.has(id)) {
        continue;
      }

      // Check if all dependencies are satisfied
      const dependencies = node.getIncomingEdges();
      const allDependenciesMet = dependencies.every(dep => completed.has(dep));

      if (allDependenciesMet) {
        executable.push(id);
      }
    }

    return executable;
  }

  /**
   * Checks if the graph contains any cycles using DFS
   *
   * Time Complexity: O(V + E)
   * Space Complexity: O(V)
   *
   * @returns true if cycle detected, false otherwise
   */
  hasCycle(): boolean {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    for (const [id] of this.nodes) {
      if (this.hasCycleDFS(id, visited, recursionStack)) {
        return true;
      }
    }

    return false;
  }

  /**
   * DFS helper for cycle detection
   *
   * Uses recursion stack to detect back edges
   *
   * @param nodeId - Current node being visited
   * @param visited - Set of all visited nodes
   * @param recursionStack - Set of nodes in current DFS path
   * @returns true if cycle detected
   */
  private hasCycleDFS(nodeId: string, visited: Set<string>, recursionStack: Set<string>): boolean {
    // Back edge detected - cycle exists
    if (recursionStack.has(nodeId)) {
      return true;
    }

    // Already visited in a previous DFS path
    if (visited.has(nodeId)) {
      return false;
    }

    visited.add(nodeId);
    recursionStack.add(nodeId);

    const node = this.nodes.get(nodeId)!;
    for (const outgoingId of node.getOutgoingEdges()) {
      if (this.hasCycleDFS(outgoingId, visited, recursionStack)) {
        return true;
      }
    }

    // Remove from recursion stack when backtracking
    recursionStack.delete(nodeId);
    return false;
  }

  /**
   * Checks if adding an edge would create a cycle
   *
   * @param fromId - Source node ID
   * @param toId - Target node ID
   * @returns true if cycle would be created
   */
  private wouldCreateCycle(fromId: string, toId: string): boolean {
    // Self-loop check
    if (fromId === toId) {
      return true;
    }

    // Check if there's already a path from toId to fromId
    // If yes, adding fromId -> toId would create a cycle
    return this.hasPath(toId, fromId);
  }

  /**
   * Checks if there's a path from one node to another using BFS
   *
   * @param fromId - Source node ID
   * @param toId - Target node ID
   * @returns true if path exists
   */
  private hasPath(fromId: string, toId: string): boolean {
    if (fromId === toId) {
      return true;
    }

    const visited = new Set<string>();
    const queue: string[] = [fromId];

    while (queue.length > 0) {
      const currentId = queue.shift()!;

      if (visited.has(currentId)) {
        continue;
      }
      visited.add(currentId);

      const node = this.nodes.get(currentId);
      if (!node) {
        continue;
      }

      for (const outgoingId of node.getOutgoingEdges()) {
        if (outgoingId === toId) {
          return true;
        }
        queue.push(outgoingId);
      }
    }

    return false;
  }

  /**
   * Gets all dependencies (incoming edges) for a node
   *
   * @param nodeId - Node to check
   * @returns Array of dependency node IDs
   * @throws Error if node doesn't exist
   */
  getDependencies(nodeId: string): string[] {
    const node = this.nodes.get(nodeId);
    if (!node) {
      throw new Error(`Node ${nodeId} does not exist`);
    }
    return node.getIncomingEdges();
  }

  /**
   * Gets all dependents (outgoing edges) for a node
   *
   * @param nodeId - Node to check
   * @returns Array of dependent node IDs
   * @throws Error if node doesn't exist
   */
  getDependents(nodeId: string): string[] {
    const node = this.nodes.get(nodeId);
    if (!node) {
      throw new Error(`Node ${nodeId} does not exist`);
    }
    return node.getOutgoingEdges();
  }

  /**
   * Checks if graph is empty
   */
  isEmpty(): boolean {
    return this.nodes.size === 0;
  }

  /**
   * Gets number of nodes in graph
   */
  size(): number {
    return this.nodes.size;
  }
}
