import { Task } from '../../domain/entities/Task';
import { Subtask } from '../../domain/entities/Subtask';
import { OxtestCommand } from '../../domain/entities/OxtestCommand';
import { PlaywrightExecutor } from '../../infrastructure/executors/PlaywrightExecutor';
import { ExecutionContextManager } from './ExecutionContextManager';
import { ExecutionContext } from '../../domain/interfaces';

/**
 * Result of subtask execution.
 */
export interface SubtaskExecutionResult {
  success: boolean;
  subtaskId: string;
  commandsExecuted: number;
  duration: number;
  error?: string;
}

/**
 * Result of task execution.
 */
export interface TaskExecutionResult {
  success: boolean;
  taskId: string;
  subtasksExecuted: number;
  duration: number;
  error?: string;
}

/**
 * Orchestrates sequential execution of tasks and subtasks.
 * Manages execution flow, context, and error handling.
 */
export class TestOrchestrator {
  constructor(
    private readonly executor: PlaywrightExecutor,
    private readonly contextManager: ExecutionContextManager
  ) {}

  /**
   * Executes a single subtask sequentially.
   * @param subtask Subtask to execute
   * @returns Execution result
   */
  public async executeSubtask(subtask: Subtask): Promise<SubtaskExecutionResult> {
    const startTime = Date.now();
    let commandsExecuted = 0;

    try {
      for (const command of subtask.commands) {
        const result = await this.executor.execute(command);
        commandsExecuted++;

        if (!result.success) {
          return {
            success: false,
            subtaskId: subtask.id,
            commandsExecuted,
            duration: Date.now() - startTime,
            error: result.error || `Command failed: ${command.type}`,
          };
        }

        // Update context after successful command
        this.updateContext(command);
      }

      return {
        success: true,
        subtaskId: subtask.id,
        commandsExecuted,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        subtaskId: subtask.id,
        commandsExecuted,
        duration: Date.now() - startTime,
        error: (error as Error).message,
      };
    }
  }

  /**
   * Executes a complete task with all its subtasks.
   * @param task Task to execute
   * @param subtasks Array of subtasks referenced by the task
   * @returns Execution result
   */
  public async executeTask(task: Task, subtasks: readonly Subtask[]): Promise<TaskExecutionResult> {
    const startTime = Date.now();
    let subtasksExecuted = 0;

    try {
      // Execute setup commands if present
      if (task.hasSetup() && task.setup) {
        const setupResult = await this.executeCommands(task.setup);
        if (!setupResult.success) {
          return {
            success: false,
            taskId: task.id,
            subtasksExecuted: 0,
            duration: Date.now() - startTime,
            error: `Setup failed: ${setupResult.error}`,
          };
        }
      }

      // Execute subtasks in sequence
      for (const subtaskId of task.subtasks) {
        const subtask = subtasks.find(s => s.id === subtaskId);

        if (!subtask) {
          return {
            success: false,
            taskId: task.id,
            subtasksExecuted,
            duration: Date.now() - startTime,
            error: `Subtask not found: ${subtaskId}`,
          };
        }

        const result = await this.executeSubtask(subtask);
        subtasksExecuted++;

        if (!result.success) {
          // Execute teardown even on failure
          if (task.hasTeardown() && task.teardown) {
            await this.executeCommands(task.teardown);
          }

          return {
            success: false,
            taskId: task.id,
            subtasksExecuted,
            duration: Date.now() - startTime,
            error: result.error || 'Subtask execution failed',
          };
        }
      }

      // Execute teardown commands if present
      if (task.hasTeardown() && task.teardown) {
        const teardownResult = await this.executeCommands(task.teardown);
        if (!teardownResult.success) {
          return {
            success: false,
            taskId: task.id,
            subtasksExecuted,
            duration: Date.now() - startTime,
            error: `Teardown failed: ${teardownResult.error}`,
          };
        }
      }

      return {
        success: true,
        taskId: task.id,
        subtasksExecuted,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        taskId: task.id,
        subtasksExecuted,
        duration: Date.now() - startTime,
        error: (error as Error).message,
      };
    }
  }

  /**
   * Executes a sequence of commands.
   * @param commands Commands to execute
   * @returns Execution result
   */
  private async executeCommands(
    commands: readonly OxtestCommand[]
  ): Promise<{ success: boolean; error?: string }> {
    for (const command of commands) {
      try {
        const result = await this.executor.execute(command);

        if (!result.success) {
          return {
            success: false,
            error: result.error || `Command failed: ${command.type}`,
          };
        }

        // Update context after successful command
        this.updateContext(command);
      } catch (error) {
        return {
          success: false,
          error: (error as Error).message,
        };
      }
    }

    return { success: true };
  }

  /**
   * Updates execution context based on command execution.
   * @param command Executed command
   */
  private updateContext(command: OxtestCommand): void {
    // Store navigation URLs
    if (command.type === 'navigate' && command.params.url) {
      this.contextManager.setVariable('lastUrl', command.params.url as string);
    }

    // Store typed values
    if ((command.type === 'type' || command.type === 'fill') && command.params.value) {
      const key = `lastTyped_${command.selector?.value || 'unknown'}`;
      this.contextManager.setVariable(key, command.params.value as string);
    }
  }

  /**
   * Gets the current execution context.
   * @returns Current execution context
   */
  public getContext(): ExecutionContext {
    return this.contextManager.getContext();
  }

  // ========== Sprint 7: State Machine Integration Methods ==========

  /**
   * Executes a subtask with full state machine tracking.
   *
   * Transitions the subtask through states:
   * Pending → InProgress → Completed (or Failed)
   *
   * @param subtask Subtask to execute (will be mutated with state updates)
   * @returns Execution result
   * @throws Error if state transition is invalid
   */
  public async executeSubtaskWithStateTracking(subtask: Subtask): Promise<SubtaskExecutionResult> {
    const startTime = Date.now();
    let commandsExecuted = 0;

    try {
      // Transition to InProgress (validates state machine)
      subtask.markInProgress();

      // Execute all commands
      for (const command of subtask.commands) {
        const result = await this.executor.execute(command);
        commandsExecuted++;

        if (!result.success) {
          // Mark as failed with error details
          subtask.markFailed(new Error(result.error || `Command failed: ${command.type}`), {
            metadata: {
              commandsExecuted,
              subtaskId: subtask.id,
              failedCommand: command.type,
            },
          });

          return {
            success: false,
            subtaskId: subtask.id,
            commandsExecuted,
            duration: Date.now() - startTime,
            error: result.error || `Command failed: ${command.type}`,
          };
        }

        // Update context after successful command
        this.updateContext(command);
      }

      // Mark as completed with success result
      subtask.markCompleted({
        success: true,
        timestamp: new Date(),
        metadata: {
          commandsExecuted,
          subtaskId: subtask.id,
        },
      });

      return {
        success: true,
        subtaskId: subtask.id,
        commandsExecuted,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      // Mark as failed on exception
      const errorObj = error as Error;
      subtask.markFailed(errorObj, {
        metadata: {
          commandsExecuted,
          subtaskId: subtask.id,
        },
      });

      return {
        success: false,
        subtaskId: subtask.id,
        commandsExecuted,
        duration: Date.now() - startTime,
        error: errorObj.message,
      };
    }
  }

  /**
   * Executes a complete task with state tracking for all subtasks.
   *
   * Features:
   * - Tracks state for each subtask
   * - Marks remaining subtasks as Blocked on failure
   * - Executes teardown even on failure
   *
   * @param task Task to execute
   * @param subtasks Array of subtasks (will be mutated with state updates)
   * @returns Execution result
   */
  public async executeTaskWithStateTracking(
    task: Task,
    subtasks: readonly Subtask[]
  ): Promise<TaskExecutionResult> {
    const startTime = Date.now();
    let subtasksExecuted = 0;

    try {
      // Execute setup commands if present
      if (task.hasSetup() && task.setup) {
        const setupResult = await this.executeCommands(task.setup);
        if (!setupResult.success) {
          // Mark all subtasks as blocked
          for (const subtaskId of task.subtasks) {
            const subtask = subtasks.find(s => s.id === subtaskId);
            if (subtask && subtask.isPending()) {
              subtask.markBlocked('Setup failed');
            }
          }

          return {
            success: false,
            taskId: task.id,
            subtasksExecuted: 0,
            duration: Date.now() - startTime,
            error: `Setup failed: ${setupResult.error}`,
          };
        }
      }

      // Execute subtasks in sequence with state tracking
      for (const subtaskId of task.subtasks) {
        const subtask = subtasks.find(s => s.id === subtaskId);

        if (!subtask) {
          return {
            success: false,
            taskId: task.id,
            subtasksExecuted,
            duration: Date.now() - startTime,
            error: `Subtask not found: ${subtaskId}`,
          };
        }

        const result = await this.executeSubtaskWithStateTracking(subtask);
        subtasksExecuted++;

        if (!result.success) {
          // Mark remaining subtasks as blocked
          const remainingIds = task.subtasks.slice(task.subtasks.indexOf(subtaskId) + 1);
          for (const remainingId of remainingIds) {
            const remainingSubtask = subtasks.find(s => s.id === remainingId);
            if (remainingSubtask && remainingSubtask.isPending()) {
              remainingSubtask.markBlocked(`Previous subtask failed: ${subtaskId}`);
            }
          }

          // Execute teardown even on failure
          if (task.hasTeardown() && task.teardown) {
            await this.executeCommands(task.teardown);
          }

          return {
            success: false,
            taskId: task.id,
            subtasksExecuted,
            duration: Date.now() - startTime,
            error: result.error || 'Subtask execution failed',
          };
        }
      }

      // Execute teardown commands if present
      if (task.hasTeardown() && task.teardown) {
        const teardownResult = await this.executeCommands(task.teardown);
        if (!teardownResult.success) {
          return {
            success: false,
            taskId: task.id,
            subtasksExecuted,
            duration: Date.now() - startTime,
            error: `Teardown failed: ${teardownResult.error}`,
          };
        }
      }

      return {
        success: true,
        taskId: task.id,
        subtasksExecuted,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        taskId: task.id,
        subtasksExecuted,
        duration: Date.now() - startTime,
        error: (error as Error).message,
      };
    }
  }
}
