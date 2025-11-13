/**
 * Supported selector strategies for locating elements in the DOM.
 * Each strategy corresponds to a Playwright locator method.
 */
export type SelectorStrategy = 'css' | 'text' | 'role' | 'xpath' | 'testid' | 'placeholder';

/**
 * Valid selector strategies that can be used in the system.
 */
export const VALID_SELECTOR_STRATEGIES: readonly SelectorStrategy[] = [
  'css',
  'text',
  'role',
  'xpath',
  'testid',
  'placeholder',
] as const;

/**
 * Type guard to check if a string is a valid SelectorStrategy.
 */
export function isValidSelectorStrategy(value: string): value is SelectorStrategy {
  return VALID_SELECTOR_STRATEGIES.includes(value as SelectorStrategy);
}
