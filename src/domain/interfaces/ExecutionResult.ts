/**
 * ExecutionResult - Interface for subtask execution results
 *
 * Part of Sprint 17: Subtask State Machine
 *
 * Captures the outcome of subtask execution with detailed metadata
 */

/**
 * Result of a subtask execution
 *
 * Stores success/failure status, output, errors, and execution metadata
 */
export interface ExecutionResult {
  /** Whether execution was successful */
  readonly success: boolean;

  /** Optional output from the execution */
  readonly output?: string;

  /** Error if execution failed */
  readonly error?: Error;

  /** Screenshot paths captured during execution */
  readonly screenshots?: ReadonlyArray<string>;

  /** Execution duration in milliseconds */
  readonly duration?: number;

  /** Timestamp when execution completed */
  readonly timestamp?: Date;

  /** Additional metadata from execution */
  readonly metadata?: Readonly<Record<string, unknown>>;
}
