/**
 * UrlValidation - Validates that the current URL matches a pattern
 *
 * Part of Sprint 16: Validation Predicates to Domain
 *
 * Checks if current page URL contains or matches a regex pattern
 */

import {
  ValidationPredicate,
  ValidationContext,
  ValidationResult,
} from '../interfaces/ValidationPredicate';
import { ValidationType } from '../enums/ValidationType';

export class UrlValidation implements ValidationPredicate {
  readonly type = ValidationType.Url;
  readonly description: string;
  readonly params: Readonly<{ pattern: string }>;

  /**
   * Creates a new UrlValidation
   *
   * @param pattern - URL pattern or regex to match
   * @param description - Optional human-readable description
   */
  constructor(pattern: string, description?: string) {
    this.params = Object.freeze({ pattern });
    this.description = description || `URL should match pattern "${pattern}"`;
  }

  /**
   * Evaluates whether the current URL matches the pattern
   *
   * @param context - Validation context with page instance
   * @returns Validation result with pass/fail status
   */
  async evaluate(context: ValidationContext): Promise<ValidationResult> {
    try {
      const currentUrl = context.page.url();
      const regex = new RegExp(this.params.pattern);
      const passed = regex.test(currentUrl);

      return {
        passed,
        message: passed
          ? `URL matches pattern "${this.params.pattern}"`
          : `URL does not match pattern "${this.params.pattern}"`,
        actualValue: currentUrl,
        expectedValue: this.params.pattern,
      };
    } catch (error) {
      return {
        passed: false,
        message: `Error checking URL: ${(error as Error).message}`,
      };
    }
  }

  /**
   * Returns string representation for debugging
   *
   * @returns String in format "Url("pattern")"
   */
  toString(): string {
    return `Url("${this.params.pattern}")`;
  }
}
