/**
 * Interface for HTML extraction strategies.
 *
 * Provides abstraction over HTML extraction implementations,
 * allowing different extraction backends (Playwright, Puppeteer, JSDOM, etc.)
 * without coupling to specific browser automation tools.
 *
 * Benefits:
 * - Enables testing with mock extractors
 * - Supports multiple browser automation tools
 * - Facilitates headless vs. headed mode switching
 * - Allows custom extraction strategies
 */
export interface IHTMLExtractor {
  /**
   * Extracts full HTML content from the page.
   * @returns Complete HTML as string
   */
  extractHTML(): Promise<string>;

  /**
   * Extracts simplified HTML without scripts, styles, and comments.
   * Useful for reducing token count when sending to LLM.
   * @returns Simplified HTML as string
   */
  extractSimplified(): Promise<string>;

  /**
   * Extracts only visible elements from the page.
   * Filters out elements with display:none or visibility:hidden.
   * @returns HTML of visible elements
   */
  extractVisible(): Promise<string>;

  /**
   * Extracts only interactive elements (buttons, inputs, links, etc.).
   * Useful for focusing LLM on actionable elements.
   * @returns HTML of interactive elements
   */
  extractInteractive(): Promise<string>;

  /**
   * Extracts HTML with semantic annotations (test IDs, ARIA labels, roles).
   * Preserves attributes that help identify elements for selectors.
   * @returns HTML with semantic attributes
   */
  extractSemantic(): Promise<string>;

  /**
   * Extracts HTML truncated to a maximum length.
   * Prioritizes interactive elements when truncating.
   * @param maxLength Maximum character length
   * @returns Truncated HTML
   */
  extractTruncated(maxLength: number): Promise<string>;
}

/**
 * Factory function type for creating HTML extractors
 */
export type HTMLExtractorFactory<T> = (context: T) => IHTMLExtractor;
