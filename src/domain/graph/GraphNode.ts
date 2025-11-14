/**
 * GraphNode - Represents a node in a Directed Acyclic Graph
 *
 * Part of Sprint 15: Task Graph/DAG Implementation
 * Implements node representation with incoming and outgoing edges
 */

export class GraphNode<T> {
  private readonly id: string;
  private readonly data: T;
  private readonly incomingEdges: Set<string>;
  private readonly outgoingEdges: Set<string>;

  /**
   * Creates a new graph node
   *
   * @param id - Unique identifier for this node
   * @param data - Data payload associated with this node
   */
  constructor(id: string, data: T) {
    this.id = id;
    this.data = data;
    this.incomingEdges = new Set();
    this.outgoingEdges = new Set();
  }

  /**
   * Gets the node's unique identifier
   */
  getId(): string {
    return this.id;
  }

  /**
   * Gets the node's data payload
   */
  getData(): T {
    return this.data;
  }

  /**
   * Gets array of incoming edge source IDs
   */
  getIncomingEdges(): string[] {
    return Array.from(this.incomingEdges);
  }

  /**
   * Gets array of outgoing edge target IDs
   */
  getOutgoingEdges(): string[] {
    return Array.from(this.outgoingEdges);
  }

  /**
   * Adds an incoming edge from another node
   *
   * @param nodeId - ID of the source node
   */
  addIncomingEdge(nodeId: string): void {
    this.incomingEdges.add(nodeId);
  }

  /**
   * Adds an outgoing edge to another node
   *
   * @param nodeId - ID of the target node
   */
  addOutgoingEdge(nodeId: string): void {
    this.outgoingEdges.add(nodeId);
  }

  /**
   * Checks if this node has an incoming edge from specified node
   *
   * @param nodeId - ID of the source node to check
   */
  hasIncomingEdge(nodeId: string): boolean {
    return this.incomingEdges.has(nodeId);
  }

  /**
   * Checks if this node has an outgoing edge to specified node
   *
   * @param nodeId - ID of the target node to check
   */
  hasOutgoingEdge(nodeId: string): boolean {
    return this.outgoingEdges.has(nodeId);
  }

  /**
   * Gets the in-degree (number of incoming edges)
   */
  getInDegree(): number {
    return this.incomingEdges.size;
  }

  /**
   * Gets the out-degree (number of outgoing edges)
   */
  getOutDegree(): number {
    return this.outgoingEdges.size;
  }

  /**
   * Checks if this is a root node (no incoming edges)
   */
  isRoot(): boolean {
    return this.incomingEdges.size === 0;
  }

  /**
   * Checks if this is a leaf node (no outgoing edges)
   */
  isLeaf(): boolean {
    return this.outgoingEdges.size === 0;
  }
}
