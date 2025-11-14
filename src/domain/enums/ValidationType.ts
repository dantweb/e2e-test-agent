/**
 * ValidationType - Enum for validation predicate types
 *
 * Part of Sprint 16: Validation Predicates to Domain
 *
 * Defines all supported validation types for test acceptance criteria
 */

export enum ValidationType {
  /** Check if element exists in DOM */
  Exists = 'exists',

  /** Check if element does not exist in DOM */
  NotExists = 'not_exists',

  /** Check if element is visible */
  Visible = 'visible',

  /** Check if element text contains expected value */
  Text = 'text',

  /** Check if input/select value matches expected value */
  Value = 'value',

  /** Check if URL matches pattern */
  Url = 'url',

  /** Check if element count matches expected value */
  Count = 'count',

  /** Custom LLM-based validation (future enhancement) */
  Custom = 'custom',
}
