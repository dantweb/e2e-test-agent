/**
 * TaskStatus - Enum for subtask execution status
 *
 * Part of Sprint 17: Subtask State Machine
 *
 * Defines all possible states for subtask execution with state transition validation
 */

/**
 * Task execution status
 */
export enum TaskStatus {
  /** Task is waiting to be executed */
  Pending = 'pending',

  /** Task is currently being executed */
  InProgress = 'in_progress',

  /** Task completed successfully */
  Completed = 'completed',

  /** Task failed during execution */
  Failed = 'failed',

  /** Task cannot execute due to unsatisfied dependencies */
  Blocked = 'blocked',
}

/**
 * Valid state transitions for task execution
 *
 * State Machine Rules:
 * - Pending: Can start execution (InProgress) or be blocked
 * - InProgress: Can complete successfully or fail
 * - Blocked: Can retry by moving to InProgress
 * - Completed: Terminal state (no transitions)
 * - Failed: Terminal state (no transitions)
 */
export const VALID_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  [TaskStatus.Pending]: [
    TaskStatus.InProgress, // Start execution
    TaskStatus.Blocked,    // Dependencies not met
  ],
  [TaskStatus.InProgress]: [
    TaskStatus.Completed,  // Successful execution
    TaskStatus.Failed,     // Execution error
  ],
  [TaskStatus.Blocked]: [
    TaskStatus.InProgress, // Retry after dependencies satisfied
  ],
  [TaskStatus.Completed]: [], // Terminal state
  [TaskStatus.Failed]: [],    // Terminal state
};

/**
 * Validates if a state transition is allowed
 *
 * @param from - Current state
 * @param to - Target state
 * @returns true if transition is valid, false otherwise
 */
export function isValidTransition(from: TaskStatus, to: TaskStatus): boolean {
  return VALID_TRANSITIONS[from].includes(to);
}

/**
 * Checks if a status is terminal (no further transitions possible)
 *
 * @param status - Status to check
 * @returns true if status is terminal (Completed or Failed)
 */
export function isTerminalStatus(status: TaskStatus): boolean {
  return status === TaskStatus.Completed || status === TaskStatus.Failed;
}
