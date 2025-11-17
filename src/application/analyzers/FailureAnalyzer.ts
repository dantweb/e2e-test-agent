import { Subtask } from '../../domain/entities/Subtask';
import { ExecutionResult } from '../../domain/interfaces/ExecutionResult';
import { OxtestCommand } from '../../domain/entities/OxtestCommand';
import { Page } from 'playwright';

/**
 * Failure context captured during test execution
 * Used by RefinementEngine to generate improved tests
 */
export interface FailureContext {
  error: string;
  failedCommand: OxtestCommand;
  commandIndex: number;
  screenshot?: Buffer;
  pageHTML?: string;
  pageURL?: string;
  availableSelectors?: string[];
  failureCategory: FailureCategory;
  timestamp: Date;
}

/**
 * Classification of failure types for targeted fixes
 */
export type FailureCategory =
  | 'SELECTOR_NOT_FOUND'
  | 'TIMEOUT'
  | 'ASSERTION_MISMATCH'
  | 'NAVIGATION_ERROR'
  | 'UNKNOWN';

/**
 * Options for failure analysis
 */
export interface AnalyzerOptions {
  captureScreenshot?: boolean;
  captureHTML?: boolean;
  maxSelectors?: number;
}

/**
 * Constants for selector prioritization
 */
const SELECTOR_PRIORITY = {
  DATA_TESTID: 1,
  ARIA_LABEL: 2,
  ID: 3,
  CLASS: 4,
  OTHER: 5,
} as const;

/**
 * Default maximum number of selectors to extract
 */
const DEFAULT_MAX_SELECTORS = 50;

/**
 * Minimum class name length to avoid utility classes
 */
const MIN_CLASS_NAME_LENGTH = 2;

/**
 * FailureAnalyzer - Captures detailed failure context
 *
 * Part of Sprint 20: Self-Healing Tests
 *
 * Analyzes test failures and extracts relevant context for LLM-powered refinement
 */
export class FailureAnalyzer {
  /**
   * Analyzes a failed test execution and captures comprehensive context
   *
   * @param subtask The subtask that failed
   * @param result The execution result containing the failure
   * @param page The Playwright page for extracting context
   * @param options Analysis options (screenshots, HTML, etc.)
   * @returns Detailed failure context for refinement
   */
  async analyze(
    subtask: Subtask,
    result: ExecutionResult,
    page: Page,
    options: AnalyzerOptions = {}
  ): Promise<FailureContext> {
    const failedCommandIndex = result.failedCommandIndex ?? 0;
    const failedCommand = subtask.commands[failedCommandIndex];

    const context: FailureContext = {
      error: result.error?.message || 'Unknown error',
      failedCommand,
      commandIndex: failedCommandIndex,
      pageURL: page.url(),
      failureCategory: 'UNKNOWN',
      timestamp: new Date(),
    };

    // Capture screenshot if enabled
    if (options.captureScreenshot) {
      try {
        context.screenshot = await page.screenshot({ fullPage: true });
      } catch (error) {
        // Ignore screenshot errors - page might be closed
      }
    }

    // Capture HTML if enabled
    if (options.captureHTML) {
      try {
        context.pageHTML = await page.content();
      } catch (error) {
        // Ignore HTML capture errors - page might be closed
      }
    }

    // Extract available selectors
    context.availableSelectors = await this.extractSelectors(page, options);

    // Categorize failure
    context.failureCategory = this.categorizeFailure(context);

    return context;
  }

  /**
   * Extracts available selectors from the page
   *
   * Prioritizes semantic selectors (data-testid, aria-label) over generic ones
   *
   * @param page The Playwright page
   * @param options Analysis options (maxSelectors limit)
   * @returns Array of available selectors, prioritized
   */
  async extractSelectors(page: Page, options: AnalyzerOptions = {}): Promise<string[]> {
    const maxSelectors = options.maxSelectors || DEFAULT_MAX_SELECTORS;

    try {
      const selectors = await this.extractSelectorsFromDOM(page);
      const unique = [...new Set(selectors)];
      const prioritized = this.prioritizeSelectors(unique);
      return prioritized.slice(0, maxSelectors);
    } catch (error) {
      // Page might be closed or evaluation failed
      return [];
    }
  }

  /**
   * Extracts selectors from the DOM via browser evaluation
   *
   * @param page The Playwright page
   * @returns Array of raw selector strings
   */
  private async extractSelectorsFromDOM(page: Page): Promise<string[]> {
    return page.evaluate((minLength: number) => {
      const found: string[] = [];

      // Extract IDs
      document.querySelectorAll('[id]').forEach(el => {
        if (el.id) found.push(`#${el.id}`);
      });

      // Extract data-testid attributes (highest priority)
      document.querySelectorAll('[data-testid]').forEach(el => {
        const testId = el.getAttribute('data-testid');
        if (testId) found.push(`[data-testid="${testId}"]`);
      });

      // Extract aria-label attributes (high priority)
      document.querySelectorAll('[aria-label]').forEach(el => {
        const label = el.getAttribute('aria-label');
        if (label) found.push(`[aria-label="${label}"]`);
      });

      // Extract common classes (avoid utility classes)
      document.querySelectorAll('[class]').forEach(el => {
        el.classList.forEach(cls => {
          // Skip utility classes (single letter, very short, or numbered)
          if (cls.length > minLength && !/^[a-z]\d+$/.test(cls)) {
            found.push(`.${cls}`);
          }
        });
      });

      return found;
    }, MIN_CLASS_NAME_LENGTH);
  }

  /**
   * Prioritizes selectors by semantic value
   *
   * Order: data-testid > aria-label > id > class
   *
   * @param selectors Array of selectors to prioritize
   * @returns Sorted array with best selectors first
   */
  private prioritizeSelectors(selectors: string[]): string[] {
    return selectors.sort((a, b) => this.getSelectorPriority(a) - this.getSelectorPriority(b));
  }

  /**
   * Calculates priority weight for a selector
   *
   * @param selector The selector string
   * @returns Priority weight (lower = higher priority)
   */
  private getSelectorPriority(selector: string): number {
    if (selector.includes('data-testid')) return SELECTOR_PRIORITY.DATA_TESTID;
    if (selector.includes('aria-label')) return SELECTOR_PRIORITY.ARIA_LABEL;
    if (selector.startsWith('#')) return SELECTOR_PRIORITY.ID;
    if (selector.startsWith('.')) return SELECTOR_PRIORITY.CLASS;
    return SELECTOR_PRIORITY.OTHER;
  }

  /**
   * Categorizes the failure type based on error message and command
   *
   * Used to provide targeted refinement hints to the LLM
   *
   * @param context Partial failure context with error and command
   * @returns Failure category for targeted fixes
   */
  categorizeFailure(context: Partial<FailureContext>): FailureCategory {
    const error = context.error?.toLowerCase() || '';

    if (error.includes('element not found') || error.includes('selector')) {
      return 'SELECTOR_NOT_FOUND';
    }

    if (error.includes('timeout') || error.includes('exceeded')) {
      return 'TIMEOUT';
    }

    if (error.includes('expected') && error.includes('got')) {
      return 'ASSERTION_MISMATCH';
    }

    if (error.includes('err_name_not_resolved') || error.includes('navigation')) {
      return 'NAVIGATION_ERROR';
    }

    return 'UNKNOWN';
  }
}
