import { OxtestCommand } from './OxtestCommand';
import { TaskMetadata, mergeMetadata, validateMetadata } from '../interfaces/TaskMetadata';

/**
 * Domain entity representing a test task.
 * A task is a high-level test scenario that can contain multiple subtasks.
 */
export class Task {
  public readonly id: string;
  public readonly description: string;
  public readonly subtasks: readonly string[];
  public readonly setup?: readonly OxtestCommand[];
  public readonly teardown?: readonly OxtestCommand[];
  public readonly metadata: TaskMetadata;

  constructor(
    id: string,
    description: string,
    subtasks: string[] = [],
    setup?: OxtestCommand[],
    teardown?: OxtestCommand[],
    metadata?: Partial<TaskMetadata>
  ) {
    // Validation
    if (!id || id.trim() === '') {
      throw new Error('Task id cannot be empty');
    }

    if (!description || description.trim() === '') {
      throw new Error('Task description cannot be empty');
    }

    // Check for duplicate subtask IDs
    const uniqueSubtasks = new Set(subtasks);
    if (uniqueSubtasks.size !== subtasks.length) {
      throw new Error('Duplicate subtask IDs are not allowed');
    }

    // Merge and validate metadata
    const mergedMetadata = mergeMetadata(metadata);
    validateMetadata(mergedMetadata);

    this.id = id;
    this.description = description;
    this.subtasks = Object.freeze([...subtasks]);
    this.setup = setup ? Object.freeze([...setup]) : undefined;
    this.teardown = teardown ? Object.freeze([...teardown]) : undefined;
    this.metadata = mergedMetadata;
  }

  /**
   * Checks if this task has subtasks.
   */
  public hasSubtasks(): boolean {
    return this.subtasks.length > 0;
  }

  /**
   * Checks if this task has setup commands.
   */
  public hasSetup(): boolean {
    return this.setup !== undefined && this.setup.length > 0;
  }

  /**
   * Checks if this task has teardown commands.
   */
  public hasTeardown(): boolean {
    return this.teardown !== undefined && this.teardown.length > 0;
  }

  /**
   * Creates a deep copy of this task.
   */
  public clone(): Task {
    return new Task(
      this.id,
      this.description,
      [...this.subtasks],
      this.setup ? this.setup.map(cmd => cmd.clone()) : undefined,
      this.teardown ? this.teardown.map(cmd => cmd.clone()) : undefined,
      { ...this.metadata }
    );
  }

  /**
   * Returns a string representation of the task.
   */
  public toString(): string {
    const parts = [`Task[${this.id}]: ${this.description}`];
    if (this.hasSubtasks()) {
      parts.push(` (${this.subtasks.length} subtasks)`);
    }
    if (this.metadata.priority && this.metadata.priority !== 0) {
      parts.push(` [priority: ${this.metadata.priority}]`);
    }
    if (this.metadata.tags && this.metadata.tags.length > 0) {
      parts.push(` [tags: ${this.metadata.tags.join(', ')}]`);
    }
    return parts.join('');
  }
}
