/**
 * NotExistsValidation - Validates that an element does NOT exist in the DOM
 *
 * Part of Sprint 16: Validation Predicates to Domain
 *
 * Checks that no elements matching the selector exist
 */

import {
  ValidationPredicate,
  ValidationContext,
  ValidationResult,
} from '../interfaces/ValidationPredicate';
import { ValidationType } from '../enums/ValidationType';

export class NotExistsValidation implements ValidationPredicate {
  readonly type = ValidationType.NotExists;
  readonly description: string;
  readonly params: Readonly<{ selector: string }>;

  /**
   * Creates a new NotExistsValidation
   *
   * @param selector - CSS selector or Playwright selector for the element
   * @param description - Optional human-readable description
   */
  constructor(selector: string, description?: string) {
    this.params = Object.freeze({ selector });
    this.description = description || `Element ${selector} should not exist`;
  }

  /**
   * Evaluates whether the element does NOT exist
   *
   * @param context - Validation context with page instance
   * @returns Validation result with pass/fail status
   */
  async evaluate(context: ValidationContext): Promise<ValidationResult> {
    try {
      const element = await context.page.locator(this.params.selector).first();
      const count = await element.count();

      return {
        passed: count === 0,
        message:
          count === 0
            ? `Element ${this.params.selector} does not exist (as expected)`
            : `Element ${this.params.selector} exists (but should not)`,
        actualValue: count,
        expectedValue: 0,
      };
    } catch (error) {
      return {
        passed: false,
        message: `Error checking non-existence: ${(error as Error).message}`,
      };
    }
  }

  /**
   * Returns string representation for debugging
   *
   * @returns String in format "NotExists(selector)"
   */
  toString(): string {
    return `NotExists(${this.params.selector})`;
  }
}
