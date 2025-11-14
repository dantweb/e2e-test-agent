/**
 * ExistsValidation - Validates that an element exists in the DOM
 *
 * Part of Sprint 16: Validation Predicates to Domain
 *
 * Checks if at least one element matching the selector exists
 */

import {
  ValidationPredicate,
  ValidationContext,
  ValidationResult,
} from '../interfaces/ValidationPredicate';
import { ValidationType } from '../enums/ValidationType';

export class ExistsValidation implements ValidationPredicate {
  readonly type = ValidationType.Exists;
  readonly description: string;
  readonly params: Readonly<{ selector: string }>;

  /**
   * Creates a new ExistsValidation
   *
   * @param selector - CSS selector or Playwright selector for the element
   * @param description - Optional human-readable description
   */
  constructor(selector: string, description?: string) {
    this.params = Object.freeze({ selector });
    this.description = description || `Element ${selector} should exist`;
  }

  /**
   * Evaluates whether the element exists
   *
   * @param context - Validation context with page instance
   * @returns Validation result with pass/fail status
   */
  async evaluate(context: ValidationContext): Promise<ValidationResult> {
    try {
      const element = await context.page.locator(this.params.selector).first();
      const count = await element.count();

      return {
        passed: count > 0,
        message:
          count > 0
            ? `Element ${this.params.selector} exists`
            : `Element ${this.params.selector} not found`,
        actualValue: count,
        expectedValue: 'at least 1',
      };
    } catch (error) {
      return {
        passed: false,
        message: `Error checking existence: ${(error as Error).message}`,
      };
    }
  }

  /**
   * Returns string representation for debugging
   *
   * @returns String in format "Exists(selector)"
   */
  toString(): string {
    return `Exists(${this.params.selector})`;
  }
}
