import { IReporter, ExecutionReport, SubtaskReport } from './IReporter';
import { TaskStatus } from '../../domain/enums/TaskStatus';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * ANSI color codes for terminal output
 */
const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',

  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',

  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
} as const;

/**
 * Status icons for different states
 */
const ICONS = {
  [TaskStatus.Completed]: '✓',
  [TaskStatus.Failed]: '✗',
  [TaskStatus.Blocked]: '⏸',
  [TaskStatus.InProgress]: '⏹',
  [TaskStatus.Pending]: '○',
} as const;

/**
 * Console Reporter - generates enhanced console output with colors and formatting
 *
 * Features:
 * - Color-coded status indicators
 * - Progress summary
 * - Detailed subtask breakdown
 * - Error highlighting
 * - Duration tracking
 *
 * Output format: Human-readable console text with ANSI colors
 */
export class ConsoleReporter implements IReporter {
  public readonly name = 'Console';
  public readonly fileExtension = 'txt';

  /**
   * Generate console report with colors and formatting
   *
   * @param report - Execution report data
   * @returns Promise resolving to formatted console output
   */
  public async generate(report: ExecutionReport): Promise<string> {
    const lines: string[] = [];

    // Header
    lines.push(this.createHeader(report));
    lines.push('');

    // Summary
    lines.push(this.createSummary(report));
    lines.push('');

    // Subtasks
    if (report.subtaskReports.length > 0) {
      lines.push(this.colorize('Subtasks:', COLORS.bright));
      lines.push(this.separator('─', 60));
      report.subtaskReports.forEach((subtask, index) => {
        lines.push(this.formatSubtask(subtask, index + 1));
      });
      lines.push('');
    }

    // Footer
    lines.push(this.separator('=', 60));
    lines.push(this.createFooter(report));
    lines.push('');

    return lines.join('\n');
  }

  /**
   * Write console report to file (with ANSI codes stripped)
   *
   * @param report - Execution report data
   * @param outputPath - Path where report should be written
   * @returns Promise resolving when file is written
   */
  public async writeToFile(report: ExecutionReport, outputPath: string): Promise<void> {
    // Ensure directory exists
    const dir = path.dirname(outputPath);
    await fs.mkdir(dir, { recursive: true });

    // Generate output
    const output = await this.generate(report);

    // Strip ANSI color codes for file output
    const plainText = this.stripAnsiCodes(output);

    // Write to file
    await fs.writeFile(outputPath, plainText, 'utf-8');
  }

  /**
   * Create header section
   */
  private createHeader(report: ExecutionReport): string {
    const lines: string[] = [];
    lines.push(this.separator('=', 60));
    lines.push(this.colorize(`Test Report: ${report.testName}`, COLORS.bright + COLORS.cyan));
    lines.push(this.separator('=', 60));
    return lines.join('\n');
  }

  /**
   * Create summary section
   */
  private createSummary(report: ExecutionReport): string {
    const statusColor = report.success ? COLORS.green : COLORS.red;
    const statusText = report.success ? 'PASSED' : 'FAILED';
    const statusIcon = report.success ? '✓' : '✗';

    const lines: string[] = [];
    lines.push(this.colorize('Summary:', COLORS.bright));
    lines.push(this.separator('─', 60));
    lines.push(
      `Status:   ${this.colorize(`${statusIcon} ${statusText}`, statusColor + COLORS.bright)}`
    );
    lines.push(`Duration: ${this.colorize(`${report.duration}ms`, COLORS.cyan)}`);
    lines.push(`Total:    ${report.totalSubtasks}`);
    lines.push(`Passed:   ${this.colorize(`${report.passed}`, COLORS.green)}`);
    lines.push(
      `Failed:   ${this.colorize(`${report.failed}`, report.failed > 0 ? COLORS.red : COLORS.gray)}`
    );
    lines.push(
      `Blocked:  ${this.colorize(`${report.blocked}`, report.blocked > 0 ? COLORS.yellow : COLORS.gray)}`
    );

    return lines.join('\n');
  }

  /**
   * Format a single subtask
   */
  private formatSubtask(subtask: SubtaskReport, index: number): string {
    const icon = ICONS[subtask.status];
    const statusColor = this.getStatusColor(subtask.status);
    const durationText = subtask.duration !== undefined ? ` (${subtask.duration}ms)` : '';

    let line = `  ${this.colorize(icon, statusColor)} [${index}] ${subtask.description}${this.colorize(durationText, COLORS.gray)}`;

    // Add error information if present
    if (subtask.error) {
      line += `\n      ${this.colorize(`Error: ${subtask.error}`, COLORS.red)}`;
    }

    // Add output information if present
    if (subtask.output && subtask.status !== TaskStatus.Completed) {
      line += `\n      ${this.colorize(`Output: ${subtask.output}`, COLORS.dim)}`;
    }

    return line;
  }

  /**
   * Create footer section
   */
  private createFooter(report: ExecutionReport): string {
    const statusColor = report.success ? COLORS.bgGreen : COLORS.bgRed;
    const statusText = report.success ? ' PASSED ' : ' FAILED ';

    return this.colorize(statusText, statusColor + COLORS.bright);
  }

  /**
   * Get color for task status
   */
  private getStatusColor(status: TaskStatus): string {
    switch (status) {
      case TaskStatus.Completed:
        return COLORS.green;
      case TaskStatus.Failed:
        return COLORS.red;
      case TaskStatus.Blocked:
        return COLORS.yellow;
      case TaskStatus.InProgress:
        return COLORS.blue;
      case TaskStatus.Pending:
        return COLORS.gray;
      default:
        return COLORS.reset;
    }
  }

  /**
   * Create separator line
   */
  private separator(char: string, length: number): string {
    return this.colorize(char.repeat(length), COLORS.gray);
  }

  /**
   * Colorize text with ANSI codes
   */
  private colorize(text: string, color: string): string {
    return `${color}${text}${COLORS.reset}`;
  }

  /**
   * Strip ANSI color codes from text
   */
  private stripAnsiCodes(text: string): string {
    return text.replace(/\x1b\[[0-9;]*m/g, '');
  }
}
