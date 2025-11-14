/**
 * TextValidation - Validates that an element's text contains expected value
 *
 * Part of Sprint 16: Validation Predicates to Domain
 *
 * Checks if element text content contains the expected substring
 */

import {
  ValidationPredicate,
  ValidationContext,
  ValidationResult,
} from '../interfaces/ValidationPredicate';
import { ValidationType } from '../enums/ValidationType';

export class TextValidation implements ValidationPredicate {
  readonly type = ValidationType.Text;
  readonly description: string;
  readonly params: Readonly<{ selector: string; expected: string }>;

  /**
   * Creates a new TextValidation
   *
   * @param selector - CSS selector or Playwright selector for the element
   * @param expected - Expected text content (substring match)
   * @param description - Optional human-readable description
   */
  constructor(selector: string, expected: string, description?: string) {
    this.params = Object.freeze({ selector, expected });
    this.description =
      description || `Element ${selector} should contain text "${expected}"`;
  }

  /**
   * Evaluates whether the element text contains expected value
   *
   * @param context - Validation context with page instance
   * @returns Validation result with pass/fail status
   */
  async evaluate(context: ValidationContext): Promise<ValidationResult> {
    try {
      const element = await context.page.locator(this.params.selector).first();
      const rawText = await element.textContent();
      const actualText = (rawText || '').trim();

      const passed = actualText.includes(this.params.expected);

      return {
        passed,
        message: passed
          ? `Element ${this.params.selector} text matches`
          : `Element ${this.params.selector} text does not contain "${this.params.expected}"`,
        actualValue: actualText,
        expectedValue: this.params.expected,
      };
    } catch (error) {
      return {
        passed: false,
        message: `Error checking text: ${(error as Error).message}`,
      };
    }
  }

  /**
   * Returns string representation for debugging
   *
   * @returns String in format "Text(selector, "expected")"
   */
  toString(): string {
    return `Text(${this.params.selector}, "${this.params.expected}")`;
  }
}
