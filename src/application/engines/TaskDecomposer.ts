import { IterativeDecompositionEngine } from './IterativeDecompositionEngine';
import { Task } from '../../domain/entities/Task';
import { Subtask } from '../../domain/entities/Subtask';
import { OxtestCommand } from '../../domain/entities/OxtestCommand';
import { SelectorSpec } from '../../domain/entities/SelectorSpec';
import { DirectedAcyclicGraph } from '../../domain/graph/DirectedAcyclicGraph';

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
 * Result of task decomposition with dependency graph
 *
 * Sprint 6: Enhanced to include TaskGraph for dependency management
 */
export interface DecompositionResult {
  subtasks: Subtask[];
  graph: DirectedAcyclicGraph<Subtask>;
}

/**
 * Options for recursive decomposition
 *
 * Sprint 19: Added support for recursive task breakdown
 */
export interface RecursiveDecompositionOptions {
  /**
   * Maximum depth of recursion (default: 3)
   * Prevents infinite recursion and excessive decomposition
   */
  maxDepth?: number;

  /**
   * Minimum number of commands before attempting further decomposition
   * Subtasks with fewer commands won't be decomposed further (default: 5)
   */
  minCommandsForRecursion?: number;

  /**
   * Function to determine if a subtask should be decomposed further
   * Receives the subtask and current depth, returns true if it should recurse
   */
  shouldRecurse?: (subtask: Subtask, depth: number) => boolean;

  /**
   * If true, continues decomposition even if errors occur (default: false)
   */
  continueOnError?: boolean;
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

  // ========== Sprint 6: TaskGraph Integration Methods ==========

  /**
   * Builds a TaskGraph from a list of subtasks with optional dependencies.
   *
   * This enables dependency-aware task execution and cycle detection.
   *
   * @param subtasks - Array of subtasks to include in the graph
   * @param dependencies - Map of subtask ID to array of dependency IDs
   * @returns DirectedAcyclicGraph containing all subtasks
   * @throws Error if dependencies form a cycle or reference non-existent subtasks
   */
  buildTaskGraph(
    subtasks: Subtask[],
    dependencies?: Map<string, string[]>
  ): DirectedAcyclicGraph<Subtask> {
    const graph = new DirectedAcyclicGraph<Subtask>();

    // Phase 1: Add all nodes
    for (const subtask of subtasks) {
      graph.addNode(subtask.id, subtask);
    }

    // Phase 2: Add edges based on dependencies
    if (dependencies) {
      for (const [subtaskId, deps] of dependencies.entries()) {
        // Verify subtask exists
        if (!graph.hasNode(subtaskId)) {
          throw new Error(`Subtask ${subtaskId} does not exist in graph`);
        }

        // Add edges for each dependency
        for (const depId of deps) {
          // Verify dependency exists
          if (!graph.hasNode(depId)) {
            throw new Error(`Dependency ${depId} does not exist in graph`);
          }

          try {
            // Add edge: dep -> subtask (dependency must execute before subtask)
            graph.addEdge(depId, subtaskId);
          } catch (error) {
            // Re-throw with more context if cycle detected
            if (error instanceof Error && error.message.includes('cycle')) {
              throw new Error(`Cycle detected in task dependencies: ${error.message}`);
            }
            throw error;
          }
        }
      }
    }

    // Phase 3: Verify graph is acyclic
    if (graph.hasCycle()) {
      throw new Error('Task dependencies contain a cycle - execution order cannot be determined');
    }

    return graph;
  }

  /**
   * Decomposes a task into multiple subtasks with dependency management.
   *
   * This method combines step-by-step decomposition with dependency graph construction,
   * enabling both parallel and sequential execution based on dependencies.
   *
   * @param task - The task being decomposed
   * @param steps - Array of step descriptions
   * @param dependencies - Map of subtask ID to array of dependency IDs
   * @param continueOnError - If true, continues decomposing remaining steps even if one fails
   * @returns DecompositionResult with subtasks and dependency graph
   * @throws Error if decomposition fails, dependencies are invalid, or cycles detected
   */
  async decomposeTaskWithDependencies(
    _task: Task,
    steps: string[],
    dependencies?: Map<string, string[]>,
    continueOnError: boolean = false
  ): Promise<DecompositionResult> {
    if (steps.length === 0) {
      const graph = new DirectedAcyclicGraph<Subtask>();
      return { subtasks: [], graph };
    }

    const subtasks: Subtask[] = [];

    // Phase 1: Decompose all steps into subtasks
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

    // Phase 2: Build TaskGraph with dependencies
    const graph = this.buildTaskGraph(subtasks, dependencies);

    return { subtasks, graph };
  }

  // ========== Sprint 19: Recursive Decomposition ==========

  /**
   * Recursively decomposes a task into finer-grained subtasks.
   *
   * This method allows breaking down complex subtasks into smaller,
   * more manageable pieces based on configurable criteria.
   *
   * Example use case:
   * - A subtask with 10+ commands might be too complex for a single execution unit
   * - Recursive decomposition can break it into 2-3 smaller subtasks
   * - Each smaller subtask is easier to test, debug, and maintain
   *
   * @param task - The task to decompose
   * @param steps - Initial step descriptions
   * @param options - Recursive decomposition options
   * @returns Array of subtasks (including recursively decomposed ones)
   */
  async decomposeTaskRecursively(
    task: Task,
    steps: string[],
    options: RecursiveDecompositionOptions = {}
  ): Promise<Subtask[]> {
    const {
      maxDepth = 3,
      minCommandsForRecursion = 5,
      shouldRecurse = (subtask: Subtask, depth: number) => {
        // Default: recurse if subtask has many commands and we're not too deep
        return subtask.commands.length >= minCommandsForRecursion && depth < maxDepth;
      },
      continueOnError = false,
    } = options;

    // Phase 1: Initial decomposition
    const initialSubtasks = await this.decomposeTaskWithSteps(task, steps, continueOnError);

    // Phase 2: Recursively decompose complex subtasks
    const finalSubtasks: Subtask[] = [];

    for (const subtask of initialSubtasks) {
      const decomposedSubtasks = await this.decomposeSubtaskRecursively(
        subtask,
        0,
        maxDepth,
        shouldRecurse,
        continueOnError
      );
      finalSubtasks.push(...decomposedSubtasks);
    }

    return finalSubtasks;
  }

  /**
   * Helper method for recursive subtask decomposition.
   *
   * @param subtask - The subtask to potentially decompose further
   * @param currentDepth - Current recursion depth
   * @param maxDepth - Maximum allowed recursion depth
   * @param shouldRecurse - Function to determine if recursion should occur
   * @param continueOnError - Whether to continue on errors
   * @returns Array of subtasks (might be just the original, or multiple decomposed ones)
   */
  private async decomposeSubtaskRecursively(
    subtask: Subtask,
    currentDepth: number,
    maxDepth: number,
    shouldRecurse: (subtask: Subtask, depth: number) => boolean,
    continueOnError: boolean
  ): Promise<Subtask[]> {
    // Base case 1: Maximum depth reached
    if (currentDepth >= maxDepth) {
      return [subtask];
    }

    // Base case 2: Subtask doesn't need further decomposition
    if (!shouldRecurse(subtask, currentDepth)) {
      return [subtask];
    }

    try {
      // Attempt to decompose this subtask further
      // Create a description that summarizes the commands
      const commandSummary = subtask.commands
        .map((cmd, idx) => `${idx + 1}. ${cmd.type}`)
        .join(', ');

      const recursiveDescription = `Break down: ${subtask.description} (${commandSummary})`;

      // Decompose into smaller steps
      const recursiveSubtask = await this.decompositionEngine.decompose(recursiveDescription);

      // If the recursive decomposition resulted in fewer or equal commands, keep original
      if (recursiveSubtask.commands.length >= subtask.commands.length) {
        return [subtask];
      }

      // Recursively process the new subtask
      const furtherDecomposed = await this.decomposeSubtaskRecursively(
        recursiveSubtask,
        currentDepth + 1,
        maxDepth,
        shouldRecurse,
        continueOnError
      );

      return furtherDecomposed;
    } catch (error) {
      if (!continueOnError) {
        throw new Error(
          `Recursive decomposition failed at depth ${currentDepth}: ${(error as Error).message}`
        );
      }
      // On error with continueOnError=true, return original subtask
      return [subtask];
    }
  }

  /**
   * Recursively decomposes a task with dependency management.
   *
   * Combines recursive decomposition with dependency graph construction.
   *
   * Note: Dependencies are preserved at the top level. Recursively decomposed
   * subtasks inherit the dependencies of their parent subtask.
   *
   * @param task - The task to decompose
   * @param steps - Initial step descriptions
   * @param dependencies - Map of step index to dependency indices
   * @param options - Recursive decomposition options
   * @returns DecompositionResult with recursively decomposed subtasks and graph
   */
  async decomposeTaskRecursivelyWithDependencies(
    task: Task,
    steps: string[],
    dependencies?: Map<string, string[]>,
    options: RecursiveDecompositionOptions = {}
  ): Promise<DecompositionResult> {
    // Phase 1: Recursive decomposition
    const subtasks = await this.decomposeTaskRecursively(task, steps, options);

    // Phase 2: Build dependency graph
    // Note: Dependencies are mapped to the final decomposed subtasks
    const graph = this.buildTaskGraph(subtasks, dependencies);

    return { subtasks, graph };
  }
}
