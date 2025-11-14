/**
 * CountValidation - Validates that the count of elements matches expected value
 *
 * Part of Sprint 16: Validation Predicates to Domain
 *
 * Checks if the number of elements matching the selector equals expected count
 */

import {
  ValidationPredicate,
  ValidationContext,
  ValidationResult,
} from '../interfaces/ValidationPredicate';
import { ValidationType } from '../enums/ValidationType';

export class CountValidation implements ValidationPredicate {
  readonly type = ValidationType.Count;
  readonly description: string;
  readonly params: Readonly<{ selector: string; expected: number }>;

  /**
   * Creates a new CountValidation
   *
   * @param selector - CSS selector or Playwright selector for the elements
   * @param expected - Expected count of elements
   * @param description - Optional human-readable description
   */
  constructor(selector: string, expected: number, description?: string) {
    this.params = Object.freeze({ selector, expected });
    this.description = description || `Element ${selector} count should be ${expected}`;
  }

  /**
   * Evaluates whether the element count matches expected value
   *
   * @param context - Validation context with page instance
   * @returns Validation result with pass/fail status
   */
  async evaluate(context: ValidationContext): Promise<ValidationResult> {
    try {
      const elements = await context.page.locator(this.params.selector);
      const actualCount = await elements.count();

      const passed = actualCount === this.params.expected;

      return {
        passed,
        message: passed
          ? `Element ${this.params.selector} count matches (${actualCount})`
          : `Element ${this.params.selector} count does not match (expected ${this.params.expected}, got ${actualCount})`,
        actualValue: actualCount,
        expectedValue: this.params.expected,
      };
    } catch (error) {
      return {
        passed: false,
        message: `Error checking count: ${(error as Error).message}`,
      };
    }
  }

  /**
   * Returns string representation for debugging
   *
   * @returns String in format "Count(selector, expected)"
   */
  toString(): string {
    return `Count(${this.params.selector}, ${this.params.expected})`;
  }
}
