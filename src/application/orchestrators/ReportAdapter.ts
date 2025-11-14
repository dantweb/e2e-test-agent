import { Subtask } from '../../domain/entities/Subtask';
import { TaskStatus } from '../../domain/enums/TaskStatus';
import { ExecutionReport, SubtaskReport } from '../../presentation/reporters/IReporter';
import { TaskExecutionResult, SubtaskExecutionResult } from './TestOrchestrator';

/**
 * Adapter to convert TestOrchestrator execution results to ExecutionReport format
 * for consumption by reporters.
 *
 * This bridges the gap between the execution layer and the presentation layer.
 */
export class ReportAdapter {
  /**
   * Convert Task execution result to ExecutionReport
   *
   * @param taskDescription - Task description/name
   * @param result - Task execution result from TestOrchestrator
   * @param subtaskResults - Array of subtask execution results
   * @param subtasks - Optional array of Subtask entities for detailed descriptions
   * @returns ExecutionReport for reporters
   */
  public static taskToExecutionReport(
    taskDescription: string,
    result: TaskExecutionResult,
    subtaskResults: SubtaskExecutionResult[],
    subtasks?: Subtask[]
  ): ExecutionReport {
    const startTime = new Date(Date.now() - result.duration);
    const endTime = new Date();

    // Build subtask reports
    const subtaskReports: SubtaskReport[] = subtaskResults.map(sr => {
      const subtask = subtasks?.find(s => s.id === sr.subtaskId);
      return this.subtaskToReport(sr, subtask);
    });

    // Calculate statistics
    const passed = subtaskReports.filter(sr => sr.status === TaskStatus.Completed).length;
    const failed = subtaskReports.filter(sr => sr.status === TaskStatus.Failed).length;
    const blocked = subtaskReports.filter(sr => sr.status === TaskStatus.Blocked).length;

    return {
      testName: taskDescription,
      startTime,
      endTime,
      duration: result.duration,
      totalSubtasks: subtaskResults.length,
      passed,
      failed,
      blocked,
      subtaskReports,
      success: result.success,
    };
  }

  /**
   * Convert Subtask execution result to SubtaskReport
   *
   * @param result - Subtask execution result
   * @param subtask - Original Subtask entity (optional)
   * @returns SubtaskReport for reporters
   */
  private static subtaskToReport(result: SubtaskExecutionResult, subtask?: Subtask): SubtaskReport {
    const status = result.success ? TaskStatus.Completed : TaskStatus.Failed;
    const timestamp = new Date(Date.now() - result.duration);

    return {
      id: result.subtaskId,
      description: subtask?.description || result.subtaskId,
      status,
      duration: result.duration,
      timestamp,
      error: result.error,
      output:
        result.commandsExecuted > 0 ? `Executed ${result.commandsExecuted} command(s)` : undefined,
    };
  }

  /**
   * Convert Subtask entity with execution state to SubtaskReport
   *
   * This method is used when Subtask has state machine tracking built-in
   *
   * @param subtask - Subtask with execution state
   * @returns SubtaskReport for reporters
   */
  public static subtaskEntityToReport(subtask: Subtask): SubtaskReport {
    const result = subtask.result;

    return {
      id: subtask.id,
      description: subtask.description,
      status: subtask.status,
      duration: result?.duration,
      timestamp: result?.timestamp,
      error: result?.error?.message,
      output: result?.output,
      screenshots: result?.screenshots,
    };
  }

  /**
   * Convert array of Subtask entities with execution state to ExecutionReport
   *
   * This method is used when Subtasks have state machine tracking built-in
   *
   * @param testName - Name of the test
   * @param subtasks - Array of Subtask entities with execution state
   * @param startTime - When execution started
   * @param endTime - When execution ended
   * @returns ExecutionReport for reporters
   */
  public static subtasksToExecutionReport(
    testName: string,
    subtasks: Subtask[],
    startTime: Date,
    endTime: Date
  ): ExecutionReport {
    const duration = endTime.getTime() - startTime.getTime();

    // Convert all subtasks to reports
    const subtaskReports: SubtaskReport[] = subtasks.map(subtask =>
      this.subtaskEntityToReport(subtask)
    );

    // Calculate statistics
    const passed = subtaskReports.filter(sr => sr.status === TaskStatus.Completed).length;
    const failed = subtaskReports.filter(sr => sr.status === TaskStatus.Failed).length;
    const blocked = subtaskReports.filter(sr => sr.status === TaskStatus.Blocked).length;

    // Determine overall success
    const success = failed === 0 && blocked === 0;

    return {
      testName,
      startTime,
      endTime,
      duration,
      totalSubtasks: subtaskReports.length,
      passed,
      failed,
      blocked,
      subtaskReports,
      success,
    };
  }
}
