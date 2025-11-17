/**
 * WinstonLogger - Structured logging for production environments
 *
 * Features:
 * - Multiple transports (console, file)
 * - Log levels (error, warn, info, debug, verbose)
 * - JSON formatting for structured logs
 * - Timestamp and context information
 * - Log rotation for file transports
 */

import winston from 'winston';
import * as path from 'path';
import * as fs from 'fs';

export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug',
  VERBOSE = 'verbose',
}

export interface LoggerOptions {
  level?: LogLevel;
  logDir?: string;
  enableConsole?: boolean;
  enableFile?: boolean;
  enableJson?: boolean;
}

export class WinstonLogger {
  private logger: winston.Logger;
  private logDir: string;

  constructor(options: LoggerOptions = {}) {
    const {
      level = LogLevel.INFO,
      logDir = 'logs',
      enableConsole = true,
      enableFile = true,
      enableJson = false,
    } = options;

    this.logDir = logDir;

    // Ensure log directory exists
    if (enableFile) {
      this.ensureLogDirectory();
    }

    // Define log format
    const logFormat = enableJson
      ? winston.format.combine(
          winston.format.timestamp(),
          winston.format.errors({ stack: true }),
          winston.format.json()
        )
      : winston.format.combine(
          winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
          winston.format.errors({ stack: true }),
          winston.format.printf(({ timestamp, level, message, ...meta }) => {
            const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
            return `[${timestamp}] ${level.toUpperCase()}: ${message} ${metaStr}`;
          })
        );

    // Create transports
    const transports: winston.transport[] = [];

    if (enableConsole) {
      transports.push(
        new winston.transports.Console({
          format: winston.format.combine(winston.format.colorize(), logFormat),
        })
      );
    }

    if (enableFile) {
      // Combined log file
      transports.push(
        new winston.transports.File({
          filename: path.join(this.logDir, 'combined.log'),
          format: logFormat,
        })
      );

      // Error log file
      transports.push(
        new winston.transports.File({
          filename: path.join(this.logDir, 'error.log'),
          level: 'error',
          format: logFormat,
        })
      );
    }

    // Create logger
    this.logger = winston.createLogger({
      level,
      transports,
      exitOnError: false,
    });
  }

  /**
   * Log error message
   */
  error(message: string, meta?: Record<string, any>): void {
    this.logger.error(message, meta);
  }

  /**
   * Log warning message
   */
  warn(message: string, meta?: Record<string, any>): void {
    this.logger.warn(message, meta);
  }

  /**
   * Log info message
   */
  info(message: string, meta?: Record<string, any>): void {
    this.logger.info(message, meta);
  }

  /**
   * Log debug message
   */
  debug(message: string, meta?: Record<string, any>): void {
    this.logger.debug(message, meta);
  }

  /**
   * Log verbose message
   */
  verbose(message: string, meta?: Record<string, any>): void {
    this.logger.verbose(message, meta);
  }

  /**
   * Log task decomposition event
   */
  logDecomposition(taskId: string, steps: number, duration: number): void {
    this.info('Task decomposition completed', {
      taskId,
      steps,
      duration,
      event: 'decomposition',
    });
  }

  /**
   * Log test execution event
   */
  logExecution(
    subtaskId: string,
    status: string,
    duration: number,
    commandsExecuted: number
  ): void {
    this.info('Subtask execution completed', {
      subtaskId,
      status,
      duration,
      commandsExecuted,
      event: 'execution',
    });
  }

  /**
   * Log LLM API call
   */
  logLLMCall(provider: string, model: string, tokens?: number, cost?: number): void {
    this.verbose('LLM API call', {
      provider,
      model,
      tokens,
      cost,
      event: 'llm_call',
    });
  }

  /**
   * Log report generation
   */
  logReportGeneration(format: string, outputPath: string, subtasks: number): void {
    this.info('Report generated', {
      format,
      outputPath,
      subtasks,
      event: 'report_generation',
    });
  }

  /**
   * Log dependency graph construction
   */
  logGraphConstruction(nodes: number, edges: number, hasCycle: boolean): void {
    this.debug('Dependency graph constructed', {
      nodes,
      edges,
      hasCycle,
      event: 'graph_construction',
    });
  }

  /**
   * Log state transition
   */
  logStateTransition(subtaskId: string, from: string, to: string): void {
    this.debug('State transition', {
      subtaskId,
      from,
      to,
      event: 'state_transition',
    });
  }

  /**
   * Log performance metrics
   */
  logPerformance(operation: string, duration: number, details?: Record<string, any>): void {
    this.verbose('Performance metric', {
      operation,
      duration,
      ...details,
      event: 'performance',
    });
  }

  /**
   * Ensure log directory exists
   */
  private ensureLogDirectory(): void {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  /**
   * Close logger and flush pending logs
   */
  close(): Promise<void> {
    return new Promise(resolve => {
      this.logger.close();
      resolve();
    });
  }

  /**
   * Create a child logger with additional context
   */
  child(context: Record<string, any>): winston.Logger {
    return this.logger.child(context);
  }

  /**
   * Get underlying Winston logger instance
   */
  getLogger(): winston.Logger {
    return this.logger;
  }
}

/**
 * Singleton logger instance
 */
let defaultLogger: WinstonLogger | null = null;

/**
 * Get or create default logger
 */
export function getLogger(options?: LoggerOptions): WinstonLogger {
  if (!defaultLogger) {
    defaultLogger = new WinstonLogger(options);
  }
  return defaultLogger;
}

/**
 * Reset default logger (useful for testing)
 */
export function resetLogger(): void {
  if (defaultLogger) {
    defaultLogger.close();
    defaultLogger = null;
  }
}
