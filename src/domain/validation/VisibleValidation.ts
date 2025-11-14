/**
 * VisibleValidation - Validates that an element is visible
 *
 * Part of Sprint 16: Validation Predicates to Domain
 *
 * Checks if element exists and is visible (not hidden by CSS/display:none)
 */

import {
  ValidationPredicate,
  ValidationContext,
  ValidationResult,
} from '../interfaces/ValidationPredicate';
import { ValidationType } from '../enums/ValidationType';

export class VisibleValidation implements ValidationPredicate {
  readonly type = ValidationType.Visible;
  readonly description: string;
  readonly params: Readonly<{ selector: string }>;

  /**
   * Creates a new VisibleValidation
   *
   * @param selector - CSS selector or Playwright selector for the element
   * @param description - Optional human-readable description
   */
  constructor(selector: string, description?: string) {
    this.params = Object.freeze({ selector });
    this.description = description || `Element ${selector} should be visible`;
  }

  /**
   * Evaluates whether the element is visible
   *
   * @param context - Validation context with page instance
   * @returns Validation result with pass/fail status
   */
  async evaluate(context: ValidationContext): Promise<ValidationResult> {
    try {
      const element = await context.page.locator(this.params.selector).first();
      const isVisible = await element.isVisible();

      return {
        passed: isVisible,
        message: isVisible
          ? `Element ${this.params.selector} is visible`
          : `Element ${this.params.selector} is not visible`,
        actualValue: isVisible,
        expectedValue: true,
      };
    } catch (error) {
      return {
        passed: false,
        message: `Error checking visibility: ${(error as Error).message}`,
      };
    }
  }

  /**
   * Returns string representation for debugging
   *
   * @returns String in format "Visible(selector)"
   */
  toString(): string {
    return `Visible(${this.params.selector})`;
  }
}
