import { Page, Locator } from 'playwright';
import { SelectorSpec } from '../../domain/entities/SelectorSpec';

/**
 * Multi-strategy element selector with fallback support.
 *
 * Attempts to locate elements using primary strategy, falling back
 * to alternative strategies if the primary fails.
 */
export class MultiStrategySelector {
  /**
   * Locates an element using the provided selector spec.
   *
   * @param page Playwright Page object
   * @param selector SelectorSpec with strategy and fallbacks
   * @returns Playwright Locator
   * @throws Error if element cannot be located with any strategy
   */
  public async locate(page: Page, selector: SelectorSpec): Promise<Locator> {
    // Try primary strategy
    const primaryLocator = this.getLocator(page, selector.strategy, selector.value);

    try {
      await primaryLocator.waitFor({ timeout: 2000, state: 'attached' });
      return primaryLocator;
    } catch (error) {
      // Try fallbacks
      if (selector.fallbacks && selector.fallbacks.length > 0) {
        for (const fallback of selector.fallbacks) {
          try {
            const fallbackLocator = this.getLocator(page, fallback.strategy, fallback.value);
            await fallbackLocator.waitFor({ timeout: 2000, state: 'attached' });
            return fallbackLocator;
          } catch {
            // Continue to next fallback
            continue;
          }
        }
      }

      throw new Error(
        `Element not found with selector: ${selector.strategy}=${selector.value}`
      );
    }
  }

  /**
   * Gets a Playwright locator for the given strategy and value.
   */
  private getLocator(page: Page, strategy: string, value: string): Locator {
    switch (strategy) {
      case 'css':
        return page.locator(value);
      case 'xpath':
        return page.locator(`xpath=${value}`);
      case 'text':
        return page.getByText(value, { exact: false });
      case 'role':
        return page.getByRole(value as any);
      case 'testid':
        return page.getByTestId(value);
      case 'placeholder':
        return page.getByPlaceholder(value);
      default:
        throw new Error(`Unsupported selector strategy: ${strategy}`);
    }
  }
}
