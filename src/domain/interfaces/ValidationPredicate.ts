/**
 * ValidationPredicate - Interface for validation predicates
 *
 * Part of Sprint 16: Validation Predicates to Domain
 *
 * Defines contract for all validation predicates in the domain layer
 */

import { Page } from 'playwright';
import { ValidationType } from '../enums/ValidationType';

/**
 * Context provided to validation predicates during evaluation
 */
export interface ValidationContext {
  /** Playwright page instance for DOM queries */
  readonly page: Page;

  /** Optional HTML snapshot for static analysis */
  readonly html?: string;

  /** Optional current URL */
  readonly url?: string;
}

/**
 * Result of validation predicate evaluation
 */
export interface ValidationResult {
  /** Whether validation passed */
  readonly passed: boolean;

  /** Human-readable message describing the result */
  readonly message?: string;

  /** Actual value found during validation */
  readonly actualValue?: unknown;

  /** Expected value for the validation */
  readonly expectedValue?: unknown;
}

/**
 * Base interface for all validation predicates
 *
 * Validation predicates are domain objects that encapsulate
 * acceptance criteria logic. They are evaluated against a
 * ValidationContext to produce a ValidationResult.
 */
export interface ValidationPredicate {
  /** Type of validation */
  readonly type: ValidationType;

  /** Human-readable description of what is being validated */
  readonly description: string;

  /** Parameters specific to this validation type */
  readonly params: Readonly<Record<string, unknown>>;

  /**
   * Evaluates the validation predicate against the given context
   *
   * @param context - Validation context containing page and optional HTML/URL
   * @returns Promise resolving to validation result
   */
  evaluate(context: ValidationContext): Promise<ValidationResult>;

  /**
   * Returns string representation of the validation predicate
   *
   * @returns String representation for debugging and logging
   */
  toString(): string;
}
