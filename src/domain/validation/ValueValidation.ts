/**
 * ValueValidation - Validates that an input/select value matches expected value
 *
 * Part of Sprint 16: Validation Predicates to Domain
 *
 * Checks if form input or select element has the expected value
 */

import {
  ValidationPredicate,
  ValidationContext,
  ValidationResult,
} from '../interfaces/ValidationPredicate';
import { ValidationType } from '../enums/ValidationType';

export class ValueValidation implements ValidationPredicate {
  readonly type = ValidationType.Value;
  readonly description: string;
  readonly params: Readonly<{ selector: string; expected: string }>;

  /**
   * Creates a new ValueValidation
   *
   * @param selector - CSS selector or Playwright selector for the input/select element
   * @param expected - Expected value
   * @param description - Optional human-readable description
   */
  constructor(selector: string, expected: string, description?: string) {
    this.params = Object.freeze({ selector, expected });
    this.description = description || `Element ${selector} should have value "${expected}"`;
  }

  /**
   * Evaluates whether the input value matches expected value
   *
   * @param context - Validation context with page instance
   * @returns Validation result with pass/fail status
   */
  async evaluate(context: ValidationContext): Promise<ValidationResult> {
    try {
      const element = await context.page.locator(this.params.selector).first();
      const actualValue = await element.inputValue();

      const passed = actualValue === this.params.expected;

      return {
        passed,
        message: passed
          ? `Element ${this.params.selector} value matches`
          : `Element ${this.params.selector} value does not match`,
        actualValue,
        expectedValue: this.params.expected,
      };
    } catch (error) {
      return {
        passed: false,
        message: `Error checking value: ${(error as Error).message}`,
      };
    }
  }

  /**
   * Returns string representation for debugging
   *
   * @returns String in format "Value(selector, "expected")"
   */
  toString(): string {
    return `Value(${this.params.selector}, "${this.params.expected}")`;
  }
}
