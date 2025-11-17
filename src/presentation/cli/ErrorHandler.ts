/**
 * ErrorHandler - Pretty error formatting and user-friendly messages
 *
 * Provides context-aware error messages with:
 * - Colored output for better visibility
 * - Suggestions for common issues
 * - Context information for debugging
 * - Exit codes for CI/CD integration
 */

import chalk from 'chalk';

export enum ErrorType {
  Configuration = 'Configuration',
  LLM = 'LLM',
  Execution = 'Execution',
  FileSystem = 'FileSystem',
  Dependency = 'Dependency',
  StateTransition = 'StateTransition',
  Unknown = 'Unknown',
}

export interface ErrorContext {
  type: ErrorType;
  message: string;
  details?: string;
  suggestions?: string[];
  file?: string;
  line?: number;
  command?: string;
}

export class ErrorHandler {
  /**
   * Handle error and exit process with appropriate code
   */
  static handle(error: Error | ErrorContext, verbose = false): never {
    if (error instanceof Error) {
      this.handleGenericError(error, verbose);
    } else {
      this.handleContextualError(error, verbose);
    }

    process.exit(1);
  }

  /**
   * Handle generic Error object
   */
  private static handleGenericError(error: Error, verbose: boolean): void {
    const context = this.classifyError(error);
    this.handleContextualError(context, verbose);
  }

  /**
   * Handle error with context information
   */
  private static handleContextualError(context: ErrorContext, verbose: boolean): void {
    console.error('\n' + chalk.red.bold(`❌ ${context.type} Error`));
    console.error(chalk.red(`   ${context.message}`));

    if (context.details) {
      console.error(chalk.gray(`\n   Details: ${context.details}`));
    }

    if (context.file) {
      console.error(chalk.gray(`   File: ${context.file}${context.line ? `:${context.line}` : ''}`));
    }

    if (context.command) {
      console.error(chalk.gray(`   Command: ${context.command}`));
    }

    if (context.suggestions && context.suggestions.length > 0) {
      console.error(chalk.yellow('\n💡 Suggestions:'));
      context.suggestions.forEach(suggestion => {
        console.error(chalk.yellow(`   • ${suggestion}`));
      });
    }

    if (verbose) {
      console.error(chalk.gray('\n📋 Troubleshooting:'));
      console.error(chalk.gray('   Run with --verbose for detailed logs'));
      console.error(chalk.gray('   Check docs/TROUBLESHOOTING.md for common issues'));
      console.error(chalk.gray('   Report issues at: https://github.com/your-org/e2e-agent/issues'));
    }

    console.error(''); // Empty line before exit
  }

  /**
   * Classify error based on message content
   */
  private static classifyError(error: Error): ErrorContext {
    const message = error.message.toLowerCase();

    // Configuration errors
    if (message.includes('api key') || message.includes('environment variable')) {
      return {
        type: ErrorType.Configuration,
        message: error.message,
        suggestions: [
          'Check your .env file exists and contains required API keys',
          'Verify environment variables are loaded: echo $OPENAI_API_KEY',
          'Use --env flag to specify .env file location',
          'See docs/GETTING_STARTED.md for configuration details',
        ],
      };
    }

    // LLM errors
    if (
      message.includes('llm') ||
      message.includes('openai') ||
      message.includes('anthropic') ||
      message.includes('rate limit') ||
      message.includes('token')
    ) {
      return {
        type: ErrorType.LLM,
        message: error.message,
        suggestions: [
          'Check API key is valid and has sufficient credits',
          'Wait a moment and retry if rate limited',
          'Try using a different model: export OPENAI_MODEL=gpt-3.5-turbo',
          'Switch providers: LLM_PROVIDER=anthropic',
          'See docs/TROUBLESHOOTING.md#llm-and-api-issues',
        ],
      };
    }

    // Execution errors
    if (
      message.includes('playwright') ||
      message.includes('browser') ||
      message.includes('selector') ||
      message.includes('timeout')
    ) {
      return {
        type: ErrorType.Execution,
        message: error.message,
        suggestions: [
          'Check the element exists: inspect page with browser DevTools',
          'Try increasing timeout: add timeout: 30000 to YAML',
          'Run in headful mode to see what\'s happening: HEADLESS=false',
          'Verify page loaded completely before interacting',
          'See docs/TROUBLESHOOTING.md#execution-issues',
        ],
      };
    }

    // File system errors
    if (
      message.includes('enoent') ||
      message.includes('file not found') ||
      message.includes('cannot read') ||
      message.includes('permission denied')
    ) {
      return {
        type: ErrorType.FileSystem,
        message: error.message,
        suggestions: [
          'Check file path is correct and file exists',
          'Verify read/write permissions: ls -la <file>',
          'Use absolute paths or verify current directory',
          'Ensure output directory exists or can be created',
        ],
      };
    }

    // Dependency/Graph errors
    if (
      message.includes('cycle') ||
      message.includes('dependency') ||
      message.includes('circular') ||
      message.includes('does not exist in graph')
    ) {
      return {
        type: ErrorType.Dependency,
        message: error.message,
        suggestions: [
          'Check for circular dependencies: A → B → A',
          'Verify all dependency IDs match subtask IDs exactly',
          'Review dependency chain for validity',
          'Use graph.topologicalSort() to visualize execution order',
          'See docs/API.md#dependency-and-graph-issues',
        ],
      };
    }

    // State transition errors
    if (message.includes('state transition') || message.includes('terminal state')) {
      return {
        type: ErrorType.StateTransition,
        message: error.message,
        suggestions: [
          'Cannot transition from terminal states (Completed/Failed)',
          'Create new subtask instance instead of reusing',
          'Check subtask.isTerminal() before executing',
          'See docs/API.md#subtask-state-machine',
        ],
      };
    }

    // Unknown error
    return {
      type: ErrorType.Unknown,
      message: error.message,
      details: error.stack,
      suggestions: [
        'This is an unexpected error. Please report it!',
        'Run with --verbose for detailed logs',
        'Check docs/TROUBLESHOOTING.md for similar issues',
        'Open issue at: https://github.com/your-org/e2e-agent/issues',
      ],
    };
  }

  /**
   * Create ErrorContext from error details
   */
  static createContext(
    type: ErrorType,
    message: string,
    options?: {
      details?: string;
      suggestions?: string[];
      file?: string;
      line?: number;
      command?: string;
    }
  ): ErrorContext {
    return {
      type,
      message,
      ...options,
    };
  }

  /**
   * Non-fatal warning
   */
  static warn(message: string, details?: string): void {
    console.warn(chalk.yellow('⚠️  Warning:'), chalk.yellow(message));
    if (details) {
      console.warn(chalk.gray(`   ${details}`));
    }
  }

  /**
   * Informational message
   */
  static info(message: string): void {
    console.log(chalk.blue('ℹ️  '), chalk.blue(message));
  }

  /**
   * Success message
   */
  static success(message: string): void {
    console.log(chalk.green('✅'), chalk.green(message));
  }
}
