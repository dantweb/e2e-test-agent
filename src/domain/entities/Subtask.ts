import { OxtestCommand } from './OxtestCommand';
import { TaskStatus, isValidTransition, VALID_TRANSITIONS } from '../enums/TaskStatus';
import { ExecutionResult } from '../interfaces/ExecutionResult';

/**
 * Domain entity representing a subtask within a test task.
 * A subtask contains a sequence of commands to be executed.
 *
 * Sprint 17: Enhanced with state machine for execution tracking
 */
export class Subtask {
  public readonly id: string;
  public readonly description: string;
  public readonly commands: readonly OxtestCommand[];

  // Sprint 17: State machine fields
  public status: TaskStatus;
  public result?: ExecutionResult;
  private executionStartTime?: number;

  constructor(id: string, description: string, commands: OxtestCommand[]) {
    // Validation
    if (!id || id.trim() === '') {
      throw new Error('Subtask id cannot be empty');
    }

    if (!description || description.trim() === '') {
      throw new Error('Subtask description cannot be empty');
    }

    if (!commands || commands.length === 0) {
      throw new Error('Subtask must have at least one command');
    }

    this.id = id;
    this.description = description;
    this.commands = Object.freeze([...commands]);

    // Sprint 17: Initialize state machine
    this.status = TaskStatus.Pending;
  }

  /**
   * Returns the number of commands in this subtask.
   */
  public getCommandCount(): number {
    return this.commands.length;
  }

  /**
   * Returns the command at the specified index, or undefined if out of bounds.
   */
  public getCommandAt(index: number): OxtestCommand | undefined {
    if (index < 0 || index >= this.commands.length) {
      return undefined;
    }
    return this.commands[index];
  }

  /**
   * Checks if this subtask contains any interaction commands.
   */
  public hasInteractionCommands(): boolean {
    return this.commands.some(cmd => cmd.isInteractionCommand());
  }

  /**
   * Checks if this subtask contains any assertion commands.
   */
  public hasAssertionCommands(): boolean {
    return this.commands.some(cmd => cmd.isAssertionCommand());
  }

  /**
   * Creates a deep copy of this subtask.
   */
  public clone(): Subtask {
    return new Subtask(
      this.id,
      this.description,
      this.commands.map(cmd => cmd.clone())
    );
  }

  /**
   * Returns a string representation of the subtask.
   */
  public toString(): string {
    return `Subtask[${this.id}]: ${this.description} (${this.commands.length} commands)`;
  }

  // ========== Sprint 17: State Machine Methods ==========

  /**
   * Marks subtask as in progress and starts execution timer
   *
   * @throws Error if transition is invalid
   */
  public markInProgress(): void {
    this.validateTransition(TaskStatus.InProgress);
    this.status = TaskStatus.InProgress;
    this.executionStartTime = Date.now();
  }

  /**
   * Marks subtask as completed with execution result
   *
   * @param result - Execution result (success=true)
   * @throws Error if transition is invalid
   */
  public markCompleted(result: ExecutionResult): void {
    this.validateTransition(TaskStatus.Completed);
    this.status = TaskStatus.Completed;

    this.result = {
      ...result,
      success: true,
      duration: this.executionStartTime
        ? Date.now() - this.executionStartTime
        : undefined,
      timestamp: new Date(),
    };
  }

  /**
   * Marks subtask as failed with error
   *
   * @param error - Error that caused failure
   * @param result - Optional additional result data
   * @throws Error if transition is invalid
   */
  public markFailed(error: Error, result?: Partial<ExecutionResult>): void {
    this.validateTransition(TaskStatus.Failed);
    this.status = TaskStatus.Failed;

    this.result = {
      success: false,
      error,
      duration: this.executionStartTime
        ? Date.now() - this.executionStartTime
        : undefined,
      timestamp: new Date(),
      ...result,
    };
  }

  /**
   * Marks subtask as blocked with reason
   *
   * @param reason - Reason for blocking (e.g., "Dependencies not met")
   * @throws Error if transition is invalid
   */
  public markBlocked(reason: string): void {
    this.validateTransition(TaskStatus.Blocked);
    this.status = TaskStatus.Blocked;

    this.result = {
      success: false,
      error: new Error(`Blocked: ${reason}`),
      timestamp: new Date(),
    };
  }

  /**
   * Validates if state transition is allowed
   *
   * @param toStatus - Target status
   * @throws Error if transition is invalid
   */
  private validateTransition(toStatus: TaskStatus): void {
    if (!isValidTransition(this.status, toStatus)) {
      throw new Error(
        `Invalid state transition: ${this.status} → ${toStatus}. ` +
          `Valid transitions from ${this.status}: ${VALID_TRANSITIONS[this.status].join(', ')}`
      );
    }
  }

  // ========== State Query Methods ==========

  /**
   * Checks if subtask is pending
   */
  public isPending(): boolean {
    return this.status === TaskStatus.Pending;
  }

  /**
   * Checks if subtask is in progress
   */
  public isInProgress(): boolean {
    return this.status === TaskStatus.InProgress;
  }

  /**
   * Checks if subtask completed successfully
   */
  public isCompleted(): boolean {
    return this.status === TaskStatus.Completed;
  }

  /**
   * Checks if subtask failed
   */
  public isFailed(): boolean {
    return this.status === TaskStatus.Failed;
  }

  /**
   * Checks if subtask is blocked
   */
  public isBlocked(): boolean {
    return this.status === TaskStatus.Blocked;
  }

  /**
   * Checks if subtask is in terminal state (completed or failed)
   */
  public isTerminal(): boolean {
    return this.isCompleted() || this.isFailed();
  }
}
