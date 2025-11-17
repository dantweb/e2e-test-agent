/**
 * Metadata interface for Task entities
 *
 * Provides additional context and configuration for tasks
 */

export interface TaskMetadata {
  /**
   * Author or creator of the task
   */
  readonly author?: string;

  /**
   * Creation timestamp
   */
  readonly created?: Date;

  /**
   * Tags for categorization and filtering
   */
  readonly tags?: readonly string[];

  /**
   * Maximum number of parallel subtasks (for Sprint 11)
   */
  readonly parallelism?: number;

  /**
   * Timeout in milliseconds for the entire task
   */
  readonly timeout?: number;

  /**
   * Number of retry attempts on failure
   */
  readonly retries?: number;

  /**
   * Priority level (higher = more important)
   */
  readonly priority?: number;

  /**
   * Environment or context for execution
   */
  readonly environment?: string;

  /**
   * Custom key-value pairs for extensibility
   */
  readonly custom?: Record<string, unknown>;
}

/**
 * Default metadata values
 */
export const DEFAULT_TASK_METADATA: TaskMetadata = {
  parallelism: 1,
  timeout: 300000, // 5 minutes
  retries: 0,
  priority: 0,
  environment: 'default',
};

/**
 * Merge metadata with defaults
 */
export function mergeMetadata(
  metadata?: Partial<TaskMetadata>
): TaskMetadata {
  const merged = {
    ...DEFAULT_TASK_METADATA,
    ...metadata,
  };

  // Deep copy arrays to ensure immutability
  if (metadata?.tags) {
    merged.tags = [...metadata.tags];
  }

  return merged;
}

/**
 * Validate metadata values
 */
export function validateMetadata(metadata: TaskMetadata): void {
  if (metadata.parallelism !== undefined && metadata.parallelism < 1) {
    throw new Error('Parallelism must be at least 1');
  }

  if (metadata.timeout !== undefined && metadata.timeout <= 0) {
    throw new Error('Timeout must be positive');
  }

  if (metadata.retries !== undefined && metadata.retries < 0) {
    throw new Error('Retries cannot be negative');
  }

  if (metadata.priority !== undefined && !Number.isInteger(metadata.priority)) {
    throw new Error('Priority must be an integer');
  }
}
