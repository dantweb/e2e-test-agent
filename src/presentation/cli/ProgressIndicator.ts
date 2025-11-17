/**
 * ProgressIndicator - Visual feedback for long-running operations
 *
 * Provides:
 * - Progress bars for multi-step operations
 * - Spinners for single long operations
 * - Colored status indicators
 * - Estimated time remaining
 */

import * as readline from 'readline';
import chalk from 'chalk';

export interface ProgressOptions {
  total: number;
  message: string;
  showPercentage?: boolean;
  showETA?: boolean;
}

export class ProgressIndicator {
  private current = 0;
  private total = 0;
  private message = '';
  private startTime = 0;
  private showPercentage = true;
  private showETA = true;
  private spinnerFrames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  private spinnerIndex = 0;
  private spinnerInterval?: NodeJS.Timeout;

  /**
   * Start a progress bar
   */
  start(options: ProgressOptions): void {
    this.total = options.total;
    this.message = options.message;
    this.current = 0;
    this.startTime = Date.now();
    this.showPercentage = options.showPercentage ?? true;
    this.showETA = options.showETA ?? true;

    console.log(chalk.bold(`\n${this.message}`));
    this.render();
  }

  /**
   * Update progress
   */
  update(current: number, details?: string): void {
    this.current = Math.min(current, this.total);
    this.render(details);
  }

  /**
   * Increment progress by 1
   */
  increment(details?: string): void {
    this.update(this.current + 1, details);
  }

  /**
   * Complete progress bar
   */
  complete(message?: string): void {
    this.current = this.total;
    this.render();
    console.log(chalk.green(`\n✅ ${message || 'Complete'}\n`));
  }

  /**
   * Fail progress bar
   */
  fail(message?: string): void {
    this.render();
    console.log(chalk.red(`\n❌ ${message || 'Failed'}\n`));
  }

  /**
   * Render progress bar
   */
  private render(details?: string): void {
    const percentage = Math.floor((this.current / this.total) * 100);
    const barLength = 40;
    const filled = Math.floor((percentage / 100) * barLength);
    const empty = barLength - filled;

    const bar = '█'.repeat(filled) + '░'.repeat(empty);

    // Calculate ETA
    const elapsed = Date.now() - this.startTime;
    const rate = this.current / (elapsed / 1000); // items per second
    const remaining = this.total - this.current;
    const eta = remaining / rate;

    // Build progress line
    let line = `  [${chalk.cyan(bar)}]`;

    if (this.showPercentage) {
      line += ` ${percentage}%`;
    }

    line += ` (${this.current}/${this.total})`;

    if (this.showETA && this.current > 0 && this.current < this.total) {
      line += ` ETA: ${this.formatTime(eta)}`;
    }

    if (details) {
      line += chalk.gray(` - ${details}`);
    }

    // Clear line and write
    readline.clearLine(process.stdout, 0);
    readline.cursorTo(process.stdout, 0);
    process.stdout.write(line);
  }

  /**
   * Start a spinner for indeterminate operations
   */
  startSpinner(message: string): void {
    this.message = message;
    this.spinnerIndex = 0;

    console.log(''); // Empty line before spinner

    this.spinnerInterval = setInterval(() => {
      const frame = this.spinnerFrames[this.spinnerIndex];
      const line = `${chalk.cyan(frame)} ${this.message}`;

      readline.clearLine(process.stdout, 0);
      readline.cursorTo(process.stdout, 0);
      process.stdout.write(line);

      this.spinnerIndex = (this.spinnerIndex + 1) % this.spinnerFrames.length;
    }, 80);
  }

  /**
   * Stop spinner
   */
  stopSpinner(message?: string, success = true): void {
    if (this.spinnerInterval) {
      clearInterval(this.spinnerInterval);
      this.spinnerInterval = undefined;
    }

    readline.clearLine(process.stdout, 0);
    readline.cursorTo(process.stdout, 0);

    if (message) {
      const icon = success ? chalk.green('✅') : chalk.red('❌');
      console.log(`${icon} ${message}`);
    }
  }

  /**
   * Update spinner message
   */
  updateSpinner(message: string): void {
    this.message = message;
  }

  /**
   * Format time in seconds to human-readable string
   */
  private formatTime(seconds: number): string {
    if (!isFinite(seconds) || seconds < 0) {
      return '...';
    }

    if (seconds < 60) {
      return `${Math.ceil(seconds)}s`;
    }

    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.ceil(seconds % 60);

    if (minutes < 60) {
      return `${minutes}m ${remainingSeconds}s`;
    }

    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  }

  /**
   * Create a multi-step progress tracker
   */
  static createMultiStep(steps: string[]): MultiStepProgress {
    return new MultiStepProgress(steps);
  }
}

/**
 * Multi-step progress tracker
 */
export class MultiStepProgress {
  private steps: string[];
  private currentStep = 0;
  private indicator: ProgressIndicator;

  constructor(steps: string[]) {
    this.steps = steps;
    this.indicator = new ProgressIndicator();
  }

  /**
   * Start multi-step progress
   */
  start(message: string): void {
    console.log(chalk.bold(`\n${message}`));
    console.log(chalk.gray(`${this.steps.length} steps total\n`));
    this.nextStep();
  }

  /**
   * Move to next step
   */
  nextStep(): void {
    if (this.currentStep > 0) {
      this.completeCurrentStep();
    }

    if (this.currentStep < this.steps.length) {
      const stepMessage = `[${this.currentStep + 1}/${this.steps.length}] ${
        this.steps[this.currentStep]
      }`;
      this.indicator.startSpinner(stepMessage);
      this.currentStep++;
    }
  }

  /**
   * Complete current step
   */
  private completeCurrentStep(): void {
    const stepMessage = `[${this.currentStep}/${this.steps.length}] ${
      this.steps[this.currentStep - 1]
    }`;
    this.indicator.stopSpinner(stepMessage, true);
  }

  /**
   * Fail current step
   */
  failStep(error: string): void {
    const stepMessage = `[${this.currentStep}/${this.steps.length}] ${
      this.steps[this.currentStep - 1]
    } - ${error}`;
    this.indicator.stopSpinner(stepMessage, false);
  }

  /**
   * Complete all steps
   */
  complete(message?: string): void {
    if (this.currentStep > 0) {
      this.completeCurrentStep();
    }
    console.log(chalk.green.bold(`\n✅ ${message || 'All steps completed'}\n`));
  }
}

/**
 * Helper functions for common progress patterns
 */
export class ProgressHelpers {
  /**
   * Track LLM decomposition progress
   */
  static async trackDecomposition<T>(
    steps: string[],
    decomposeFn: (step: string, index: number) => Promise<T>
  ): Promise<T[]> {
    const progress = new ProgressIndicator();
    progress.start({
      total: steps.length,
      message: '🤖 Decomposing steps with LLM...',
      showETA: true,
    });

    const results: T[] = [];

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      progress.update(i + 1, `Processing: ${step.substring(0, 50)}...`);

      try {
        const result = await decomposeFn(step, i);
        results.push(result);
      } catch (error) {
        progress.fail(`Failed at step ${i + 1}: ${step}`);
        throw error;
      }
    }

    progress.complete(`Successfully decomposed ${steps.length} steps`);
    return results;
  }

  /**
   * Track test execution progress
   */
  static async trackExecution<T>(
    tests: Array<{ name: string; fn: () => Promise<T> }>
  ): Promise<Array<{ name: string; result: T; success: boolean }>> {
    const progress = new ProgressIndicator();
    progress.start({
      total: tests.length,
      message: '🌐 Executing tests...',
      showETA: true,
    });

    const results: Array<{ name: string; result: T; success: boolean }> = [];

    for (let i = 0; i < tests.length; i++) {
      const test = tests[i];
      progress.update(i + 1, test.name);

      try {
        const result = await test.fn();
        results.push({ name: test.name, result, success: true });
      } catch (error) {
        results.push({ name: test.name, result: error as T, success: false });
      }
    }

    const passedCount = results.filter(r => r.success).length;
    const failedCount = results.length - passedCount;

    if (failedCount === 0) {
      progress.complete(`All ${tests.length} tests passed`);
    } else {
      progress.complete(`${passedCount} passed, ${failedCount} failed`);
    }

    return results;
  }

  /**
   * Track file operations
   */
  static async trackFileOperations<T>(
    files: string[],
    operationName: string,
    operationFn: (file: string) => Promise<T>
  ): Promise<T[]> {
    const progress = new ProgressIndicator();
    progress.start({
      total: files.length,
      message: `📁 ${operationName}...`,
    });

    const results: T[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileName = file.split('/').pop() || file;
      progress.update(i + 1, fileName);

      try {
        const result = await operationFn(file);
        results.push(result);
      } catch (error) {
        progress.fail(`Failed on file: ${fileName}`);
        throw error;
      }
    }

    progress.complete(`${operationName} complete: ${files.length} files`);
    return results;
  }
}
