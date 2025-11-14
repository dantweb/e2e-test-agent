import { IterativeDecompositionEngine } from './IterativeDecompositionEngine';
import { Task } from '../../domain/entities/Task';
import { Subtask } from '../../domain/entities/Subtask';
import { OxtestCommand } from '../../domain/entities/OxtestCommand';
import { SelectorSpec } from '../../domain/entities/SelectorSpec';

/**
 * Validation predicates that can be used to validate task execution
 */
export interface ValidationPredicates {
  url_contains?: string;
  element_exists?: string;
  element_not_exists?: string;
  element_visible?: string;
  element_hidden?: string;
  text_contains?: string;
  text_equals?: string;
  value_equals?: string;
  [key: string]: string | undefined;
}

/**
 * TaskDecomposer breaks down high-level tasks into executable subtasks.
 * It uses the IterativeDecompositionEngine to generate step-by-step commands
 * and handles setup/teardown sequences.
 */
export class TaskDecomposer {
  constructor(private readonly decompositionEngine: IterativeDecompositionEngine) {}

  /**
   * Decomposes a high-level task into a single subtask.
   * Uses the task description as a single step for decomposition.
   *
   * @param task - The task to decompose
   * @returns Array containing a single subtask with generated commands
   */
  async decomposeTask(task: Task): Promise<Subtask[]> {
    const subtask = await this.decompositionEngine.decompose(task.description);
    return [subtask];
  }

  /**
   * Decomposes a task into multiple subtasks based on provided steps.
   * Each step is decomposed independently using the decomposition engine.
   *
   * @param task - The task being decomposed
   * @param steps - Array of step descriptions
   * @param continueOnError - If true, continues decomposing remaining steps even if one fails
   * @returns Array of subtasks, one per step
   */
  async decomposeTaskWithSteps(
    _task: Task,
    steps: string[],
    continueOnError: boolean = false
  ): Promise<Subtask[]> {
    if (steps.length === 0) {
      return [];
    }

    const subtasks: Subtask[] = [];

    for (let i = 0; i < steps.length; i++) {
      try {
        const subtask = await this.decompositionEngine.decompose(steps[i]);
        subtasks.push(subtask);
      } catch (error) {
        if (!continueOnError) {
          throw error;
        }
        // If continueOnError is true, skip this step and continue
      }
    }

    return subtasks;
  }

  /**
   * Creates a validation subtask from validation predicates.
   * Converts predicates into assertion commands that can be executed.
   *
   * @param task - The task being validated
   * @param predicates - Validation predicates to check
   * @returns A subtask containing validation commands
   */
  decomposeIntoValidationSubtask(task: Task, predicates: ValidationPredicates): Subtask {
    const commands: OxtestCommand[] = [];

    // Convert each predicate into a validation command
    if (predicates.url_contains) {
      commands.push(
        new OxtestCommand('assertUrl', {
          expected: predicates.url_contains,
        })
      );
    }

    if (predicates.element_exists) {
      commands.push(
        new OxtestCommand('assertVisible', {}, new SelectorSpec('css', predicates.element_exists))
      );
    }

    if (predicates.element_not_exists) {
      commands.push(
        new OxtestCommand(
          'assertHidden',
          {},
          new SelectorSpec('css', predicates.element_not_exists)
        )
      );
    }

    if (predicates.element_visible) {
      commands.push(
        new OxtestCommand('assertVisible', {}, new SelectorSpec('css', predicates.element_visible))
      );
    }

    if (predicates.element_hidden) {
      commands.push(
        new OxtestCommand('assertHidden', {}, new SelectorSpec('css', predicates.element_hidden))
      );
    }

    if (predicates.text_contains) {
      commands.push(
        new OxtestCommand('assertText', {
          expected: predicates.text_contains,
        })
      );
    }

    if (predicates.text_equals) {
      commands.push(
        new OxtestCommand('assertText', {
          expected: predicates.text_equals,
          exact: true,
        })
      );
    }

    if (predicates.value_equals) {
      commands.push(
        new OxtestCommand('assertValue', {
          expected: predicates.value_equals,
        })
      );
    }

    // If no validation commands, add a no-op wait
    if (commands.length === 0) {
      commands.push(new OxtestCommand('wait', { duration: 0 }));
    }

    return new Subtask(`${task.id}-validation`, `Validation for: ${task.description}`, commands);
  }
}
