/**
 * ITaskGraph - Interface for task dependency graph
 *
 * Part of Sprint 15: Task Graph/DAG Implementation
 * Defines contract for graph-based task management
 */

export interface ITaskGraph<T> {
  /**
   * Adds a node to the graph
   *
   * @param id - Unique identifier for the node
   * @param data - Data payload for the node
   * @throws Error if node with this ID already exists
   */
  addNode(id: string, data: T): void;

  /**
   * Adds a directed edge from one node to another
   *
   * @param fromId - Source node ID
   * @param toId - Target node ID
   * @throws Error if either node doesn't exist or if edge would create a cycle
   */
  addEdge(fromId: string, toId: string): void;

  /**
   * Returns nodes in topological order using Kahn's algorithm
   *
   * @returns Array of node IDs in execution order
   */
  topologicalSort(): string[];

  /**
   * Returns nodes that can be executed given a set of completed nodes
   *
   * @param completed - Set of completed node IDs
   * @returns Array of node IDs that are ready to execute
   */
  getExecutableNodes(completed: Set<string>): string[];

  /**
   * Checks if the graph contains any cycles
   *
   * @returns true if cycle detected, false otherwise
   */
  hasCycle(): boolean;

  /**
   * Gets all dependencies (incoming edges) for a node
   *
   * @param nodeId - Node to check
   * @returns Array of dependency node IDs
   * @throws Error if node doesn't exist
   */
  getDependencies(nodeId: string): string[];

  /**
   * Gets all dependents (outgoing edges) for a node
   *
   * @param nodeId - Node to check
   * @returns Array of dependent node IDs
   * @throws Error if node doesn't exist
   */
  getDependents(nodeId: string): string[];
}
