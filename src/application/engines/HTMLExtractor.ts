import { Page } from 'playwright';
import { IHTMLExtractor } from '../interfaces/IHTMLExtractor';

/**
 * Playwright-based implementation of HTML extraction.
 *
 * Extracts HTML content from a Playwright page in various formats.
 * Used to provide context to LLM for iterative decomposition.
 *
 * This is an adapter that implements IHTMLExtractor interface,
 * allowing IterativeDecompositionEngine to work with any HTML
 * extraction backend, not just Playwright.
 */
export class HTMLExtractor implements IHTMLExtractor {
  constructor(private readonly page: Page) {}

  /**
   * Extracts full HTML content from the page.
   * @returns Complete HTML as string
   */
  public async extractHTML(): Promise<string> {
    return await this.page.content();
  }

  /**
   * Extracts simplified HTML without scripts, styles, and comments.
   * Useful for reducing token count when sending to LLM.
   * @returns Simplified HTML as string
   */
  public async extractSimplified(): Promise<string> {
    return await this.page.evaluate(() => {
      const clone = document.body.cloneNode(true) as HTMLElement;

      // Remove script tags
      clone.querySelectorAll('script').forEach(el => el.remove());

      // Remove style tags
      clone.querySelectorAll('style').forEach(el => el.remove());

      // Remove comments
      const removeComments = (node: Node): void => {
        const children = Array.from(node.childNodes);
        children.forEach(child => {
          if (child.nodeType === Node.COMMENT_NODE) {
            child.remove();
          } else if (child.nodeType === Node.ELEMENT_NODE) {
            removeComments(child);
          }
        });
      };
      removeComments(clone);

      return clone.outerHTML;
    });
  }

  /**
   * Extracts only visible elements from the page.
   * Filters out elements with display:none or visibility:hidden.
   * @returns HTML of visible elements
   */
  public async extractVisible(): Promise<string> {
    return await this.page.evaluate(() => {
      const isVisible = (el: Element): boolean => {
        const style = window.getComputedStyle(el);
        return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
      };

      const clone = document.body.cloneNode(true) as HTMLElement;

      // Remove hidden elements from clone
      const removeHidden = (clonedNode: Element, originalNode: Element): void => {
        if (!isVisible(originalNode)) {
          clonedNode.remove();
          return;
        }

        const clonedChildren = Array.from(clonedNode.children);
        const originalChildren = Array.from(originalNode.children);

        for (let i = 0; i < clonedChildren.length; i++) {
          if (originalChildren[i]) {
            removeHidden(clonedChildren[i], originalChildren[i]);
          }
        }
      };

      removeHidden(clone, document.body);

      return clone.outerHTML;
    });
  }

  /**
   * Extracts only interactive elements (buttons, inputs, links, etc.).
   * Useful for focusing LLM on actionable elements.
   * @returns HTML of interactive elements
   */
  public async extractInteractive(): Promise<string> {
    return await this.page.evaluate(() => {
      const interactiveTags = new Set(['BUTTON', 'A', 'INPUT', 'TEXTAREA', 'SELECT', 'FORM']);

      const isInteractive = (el: Element): boolean => {
        return (
          interactiveTags.has(el.tagName) ||
          el.hasAttribute('onclick') ||
          el.getAttribute('role') === 'button' ||
          el.getAttribute('role') === 'link'
        );
      };

      const extractInteractiveElements = (root: Element): Element[] => {
        const interactive: Element[] = [];

        const traverse = (node: Element): void => {
          if (isInteractive(node)) {
            interactive.push(node);
          }

          Array.from(node.children).forEach(traverse);
        };

        traverse(root);
        return interactive;
      };

      const elements = extractInteractiveElements(document.body);

      // Create a simplified HTML structure
      const container = document.createElement('div');
      elements.forEach(el => {
        container.appendChild(el.cloneNode(true));
      });

      return container.innerHTML;
    });
  }

  /**
   * Extracts HTML with semantic annotations (test IDs, ARIA labels, roles).
   * Preserves attributes that help identify elements for selectors.
   * @returns HTML with semantic attributes
   */
  public async extractSemantic(): Promise<string> {
    return await this.page.evaluate(() => {
      const clone = document.body.cloneNode(true) as HTMLElement;

      // Remove non-semantic attributes to reduce noise
      const cleanElement = (el: Element): void => {
        const semanticAttrs = [
          'id',
          'name',
          'data-testid',
          'data-test',
          'aria-label',
          'aria-labelledby',
          'role',
          'placeholder',
          'type',
          'href',
        ];

        // Get all attributes
        const attrs = Array.from(el.attributes);

        // Remove non-semantic attributes
        attrs.forEach(attr => {
          if (!semanticAttrs.includes(attr.name)) {
            el.removeAttribute(attr.name);
          }
        });

        // Recursively clean children
        Array.from(el.children).forEach(cleanElement);
      };

      cleanElement(clone);

      return clone.outerHTML;
    });
  }

  /**
   * Extracts HTML truncated to a maximum length.
   * Prioritizes interactive elements when truncating.
   * @param maxLength Maximum character length
   * @returns Truncated HTML
   */
  public async extractTruncated(maxLength: number): Promise<string> {
    // First try to get interactive elements
    const interactive = await this.extractInteractive();

    if (interactive.length > 0 && interactive.length <= maxLength) {
      return interactive;
    }

    // If no interactive elements or still too long, get simplified version
    const simplified = await this.extractSimplified();

    if (simplified.length <= maxLength) {
      return simplified;
    }

    // Last resort: truncate simplified HTML
    return simplified.substring(0, maxLength) + '\n<!-- [Truncated] -->';
  }
}
