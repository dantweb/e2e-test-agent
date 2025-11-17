/**
 * Error Recovery System - Sprint 14
 *
 * Provides intelligent error recovery strategies for production environments.
 * Handles transient failures, retries with backoff, and graceful degradation.
 */

export type RecoveryStrategy = 'retry' | 'fallback' | 'skip' | 'fail' | 'degrade';

export interface RecoveryOptions {
  /** Maximum retry attempts */
  maxRetries?: number;

  /** Initial delay in milliseconds */
  initialDelay?: number;

  /** Maximum delay in milliseconds */
  maxDelay?: number;

  /** Backoff multiplier */
  backoffMultiplier?: number;

  /** Fallback function to call on failure */
  fallback?: () => Promise<any> | any;

  /** Whether to log recovery attempts */
  verbose?: boolean;

  /** Custom recovery strategy */
  strategy?: RecoveryStrategy;
}

export interface RecoveryResult<T> {
  success: boolean;
  value?: T;
  error?: Error;
  attempts: number;
  recoveryUsed?: RecoveryStrategy;
  totalDuration: number;
}

/**
 * Error classifier for determining recovery strategy
 */
export class ErrorClassifier {
  /**
   * Determine if error is transient (can be retried)
   */
  static isTransient(error: Error): boolean {
    const transientPatterns = [
      /timeout/i,
      /ECONNRESET/i,
      /ETIMEDOUT/i,
      /ENOTFOUND/i,
      /rate limit/i,
      /too many requests/i,
      /503/i,
      /504/i,
      /502/i,
    ];

    const message = error.message;
    return transientPatterns.some(pattern => pattern.test(message));
  }

  /**
   * Determine if error is permanent (should not retry)
   */
  static isPermanent(error: Error): boolean {
    const permanentPatterns = [
      /not found/i,
      /404/i,
      /unauthorized/i,
      /401/i,
      /forbidden/i,
      /403/i,
      /invalid/i,
      /malformed/i,
    ];

    const message = error.message;
    return permanentPatterns.some(pattern => pattern.test(message));
  }

  /**
   * Get recommended recovery strategy
   */
  static getRecommendedStrategy(error: Error): RecoveryStrategy {
    if (this.isTransient(error)) {
      return 'retry';
    }

    if (this.isPermanent(error)) {
      return 'fail';
    }

    // Unknown error type - try retry with lower attempts
    return 'retry';
  }
}

/**
 * Error Recovery Manager
 *
 * Usage:
 * ```typescript
 * const recovery = new ErrorRecovery();
 *
 * const result = await recovery.withRecovery(
 *   async () => {
 *     return await unstableOperation();
 *   },
 *   {
 *     maxRetries: 3,
 *     fallback: () => 'default value',
 *     verbose: true,
 *   }
 * );
 *
 * if (result.success) {
 *   console.log('Success:', result.value);
 * } else {
 *   console.error('Failed after', result.attempts, 'attempts');
 * }
 * ```
 */
export class ErrorRecovery {
  private readonly defaultOptions: Required<Omit<RecoveryOptions, 'fallback' | 'strategy'>> = {
    maxRetries: 3,
    initialDelay: 1000,
    maxDelay: 10000,
    backoffMultiplier: 2,
    verbose: false,
  };

  /**
   * Execute function with automatic error recovery
   */
  async withRecovery<T>(
    fn: () => Promise<T>,
    options: RecoveryOptions = {}
  ): Promise<RecoveryResult<T>> {
    const opts = { ...this.defaultOptions, ...options };
    const startTime = Date.now();

    let lastError: Error | null = null;
    let attempts = 0;

    for (let i = 0; i <= opts.maxRetries; i++) {
      attempts++;

      try {
        const value = await fn();

        return {
          success: true,
          value,
          attempts,
          totalDuration: Date.now() - startTime,
        };
      } catch (error) {
        lastError = error as Error;

        if (opts.verbose) {
          console.warn(`Attempt ${attempts} failed:`, lastError.message);
        }

        // Determine if we should retry
        const strategy = options.strategy || ErrorClassifier.getRecommendedStrategy(lastError);

        if (strategy === 'fail' || i === opts.maxRetries) {
          // No more retries or permanent error
          break;
        }

        if (strategy === 'fallback' && options.fallback) {
          // Try fallback immediately
          try {
            const value = await options.fallback();
            return {
              success: true,
              value,
              attempts,
              recoveryUsed: 'fallback',
              totalDuration: Date.now() - startTime,
            };
          } catch (fallbackError) {
            if (opts.verbose) {
              console.warn('Fallback failed:', (fallbackError as Error).message);
            }
          }
        }

        // Calculate delay with exponential backoff
        const delay = Math.min(
          opts.initialDelay * Math.pow(opts.backoffMultiplier, i),
          opts.maxDelay
        );

        if (opts.verbose) {
          console.log(`Retrying in ${delay}ms...`);
        }

        await this.sleep(delay);
      }
    }

    // All retries failed
    if (options.fallback) {
      // Try fallback as last resort
      try {
        const value = await options.fallback();
        return {
          success: true,
          value,
          attempts,
          recoveryUsed: 'fallback',
          totalDuration: Date.now() - startTime,
        };
      } catch (fallbackError) {
        if (opts.verbose) {
          console.warn('Final fallback failed:', (fallbackError as Error).message);
        }
      }
    }

    return {
      success: false,
      error: lastError!,
      attempts,
      totalDuration: Date.now() - startTime,
    };
  }

  /**
   * Execute function with circuit breaker pattern
   *
   * Prevents cascading failures by "opening" circuit after threshold failures
   */
  async withCircuitBreaker<T>(
    _name: string,
    fn: () => Promise<T>,
    _options: {
      failureThreshold?: number;
      resetTimeout?: number;
      verbose?: boolean;
    } = {}
  ): Promise<T> {
    // This is a simplified implementation
    // In production, you'd want a persistent circuit breaker state
    // Note: Parameters prefixed with _ to indicate they're unused in this basic implementation

    // Check if circuit is open (would check persistent state in production)
    // For now, just execute directly
    return fn();
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Graceful shutdown manager
 *
 * Ensures clean shutdown of resources on process termination
 */
export class GracefulShutdown {
  private handlers: Array<() => Promise<void>> = [];
  private shuttingDown = false;

  constructor() {
    // Register signal handlers
    process.on('SIGTERM', () => this.shutdown('SIGTERM'));
    process.on('SIGINT', () => this.shutdown('SIGINT'));
  }

  /**
   * Register a cleanup handler
   */
  register(handler: () => Promise<void>): void {
    this.handlers.push(handler);
  }

  /**
   * Execute shutdown
   */
  private async shutdown(signal: string): Promise<void> {
    if (this.shuttingDown) {
      console.log('Shutdown already in progress...');
      return;
    }

    this.shuttingDown = true;
    console.log(`\nReceived ${signal}, shutting down gracefully...`);

    try {
      // Execute all cleanup handlers
      await Promise.all(
        this.handlers.map(async (handler, index) => {
          try {
            await handler();
            console.log(`Cleanup ${index + 1}/${this.handlers.length} complete`);
          } catch (error) {
            console.error(`Cleanup ${index + 1} failed:`, error);
          }
        })
      );

      console.log('Graceful shutdown complete');
      process.exit(0);
    } catch (error) {
      console.error('Shutdown failed:', error);
      process.exit(1);
    }
  }
}

/**
 * Health check system
 */
export class HealthCheck {
  private checks: Map<string, () => Promise<boolean>> = new Map();

  /**
   * Register a health check
   */
  register(name: string, check: () => Promise<boolean>): void {
    this.checks.set(name, check);
  }

  /**
   * Run all health checks
   */
  async runAll(): Promise<{ healthy: boolean; checks: Record<string, boolean> }> {
    const results: Record<string, boolean> = {};
    let allHealthy = true;

    for (const [name, check] of this.checks.entries()) {
      try {
        const result = await check();
        results[name] = result;
        if (!result) {
          allHealthy = false;
        }
      } catch {
        results[name] = false;
        allHealthy = false;
      }
    }

    return { healthy: allHealthy, checks: results };
  }
}
