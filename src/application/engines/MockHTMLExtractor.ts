import { IHTMLExtractor } from '../interfaces/IHTMLExtractor';

/**
 * Mock implementation of IHTMLExtractor for testing purposes.
 *
 * Allows testing of components that depend on HTML extraction
 * without requiring a real browser or Playwright instance.
 *
 * Usage:
 * ```typescript
 * const mockExtractor = new MockHTMLExtractor({
 *   html: '<html><body><button id="submit">Submit</button></body></html>',
 *   simplified: '<body><button id="submit">Submit</button></body>',
 * });
 *
 * const engine = new IterativeDecompositionEngine(
 *   mockLLMProvider,
 *   mockExtractor,
 *   mockParser
 * );
 * ```
 */
export class MockHTMLExtractor implements IHTMLExtractor {
  constructor(
    private readonly responses: {
      html?: string;
      simplified?: string;
      visible?: string;
      interactive?: string;
      semantic?: string;
      truncated?: string;
    } = {}
  ) {}

  async extractHTML(): Promise<string> {
    return this.responses.html || '<html><body><div>Mock HTML content</div></body></html>';
  }

  async extractSimplified(): Promise<string> {
    return this.responses.simplified || '<body><div>Mock simplified content</div></body>';
  }

  async extractVisible(): Promise<string> {
    return (
      this.responses.visible || '<body><div style="display: block;">Visible content</div></body>'
    );
  }

  async extractInteractive(): Promise<string> {
    return (
      this.responses.interactive ||
      '<div><button id="btn1">Click me</button><input id="input1" /></div>'
    );
  }

  async extractSemantic(): Promise<string> {
    return (
      this.responses.semantic ||
      '<body><button id="submit" aria-label="Submit form">Submit</button></body>'
    );
  }

  async extractTruncated(maxLength: number): Promise<string> {
    if (this.responses.truncated) {
      return this.responses.truncated.substring(0, maxLength);
    }

    const defaultContent = '<body><div>Mock truncated content</div></body>';
    if (defaultContent.length <= maxLength) {
      return defaultContent;
    }

    return defaultContent.substring(0, maxLength) + '\n<!-- [Truncated] -->';
  }

  /**
   * Update mock responses dynamically during tests
   */
  setResponses(responses: Partial<typeof this.responses>): void {
    Object.assign(this.responses, responses);
  }
}

/**
 * Static HTML extractor that returns predefined content.
 * Useful for tests that don't need dynamic HTML changes.
 */
export class StaticHTMLExtractor implements IHTMLExtractor {
  constructor(private readonly staticHTML: string = '<html><body></body></html>') {}

  async extractHTML(): Promise<string> {
    return this.staticHTML;
  }

  async extractSimplified(): Promise<string> {
    return this.staticHTML;
  }

  async extractVisible(): Promise<string> {
    return this.staticHTML;
  }

  async extractInteractive(): Promise<string> {
    return this.staticHTML;
  }

  async extractSemantic(): Promise<string> {
    return this.staticHTML;
  }

  async extractTruncated(maxLength: number): Promise<string> {
    if (this.staticHTML.length <= maxLength) {
      return this.staticHTML;
    }
    return this.staticHTML.substring(0, maxLength) + '\n<!-- [Truncated] -->';
  }
}
