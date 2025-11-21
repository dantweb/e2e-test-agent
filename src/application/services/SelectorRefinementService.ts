/**
 * SelectorRefinementService - Refines selectors using LLM when execution fails
 *
 * Single Responsibility: Selector refinement during execution failures
 *
 * This service analyzes failed selectors and the current page HTML to
 * generate better selector suggestions using LLM.
 */

import { ILLMProvider } from '../../infrastructure/llm/interfaces';
import { Page } from 'playwright';

/**
 * Context about a failed selector
 */
export interface FailedSelectorContext {
  /** The selector that failed */
  originalSelector: {
    strategy: string;
    value: string;
  };

  /** Fallback selectors that were tried (if any) */
  triedFallbacks?: Array<{
    strategy: string;
    value: string;
  }>;

  /** Error message from the failure */
  error: string;

  /** Current page URL */
  pageURL: string;

  /** Current page HTML (simplified) */
  pageHTML: string;

  /** What action we're trying to perform */
  action: string;

  /** Description of what element we're looking for */
  elementDescription?: string;
}

/**
 * Refined selector suggestion from LLM
 */
export interface RefinedSelector {
  /** New primary selector to try */
  primary: {
    strategy: string;
    value: string;
  };

  /** New fallback selectors */
  fallbacks: Array<{
    strategy: string;
    value: string;
  }>;

  /** Confidence score (0-1) */
  confidence: number;

  /** Explanation of why this selector should work */
  reasoning: string;
}

/**
 * Service for refining failed selectors using LLM
 */
export class SelectorRefinementService {
  constructor(private readonly llmProvider: ILLMProvider) {}

  /**
   * Refines a failed selector by analyzing current page HTML
   *
   * @param context Failed selector context
   * @returns Refined selector suggestions
   */
  async refineSelector(context: FailedSelectorContext): Promise<RefinedSelector> {
    const prompt = this.buildRefinementPrompt(context);
    const systemPrompt = this.buildSystemPrompt();

    try {
      const response = await this.llmProvider.generate(prompt, {
        systemPrompt,
        temperature: 0.2, // Lower temperature for more predictable selector generation
        maxTokens: 500,
      });

      return this.parseRefinementResponse(response.content);
    } catch (error) {
      throw new Error(`Selector refinement failed: ${(error as Error).message}`);
    }
  }

  /**
   * Extracts simplified HTML from a Playwright page
   *
   * @param page Playwright page
   * @returns Simplified HTML string
   */
  async extractPageHTML(page: Page): Promise<string> {
    return await page.evaluate(() => {
      const body = document.body.cloneNode(true) as HTMLElement;

      // Remove scripts, styles, and comments
      body.querySelectorAll('script, style').forEach(el => el.remove());

      // Remove inline styles to reduce noise
      body.querySelectorAll('[style]').forEach(el => el.removeAttribute('style'));

      return body.innerHTML;
    });
  }

  /**
   * Builds the system prompt for selector refinement
   */
  private buildSystemPrompt(): string {
    return `You are an expert at analyzing HTML and creating robust CSS selectors and XPath expressions.

Your task is to analyze failed selectors and suggest better alternatives based on the current page HTML.

Key principles:
1. Prefer semantic selectors (data-testid, aria-label, role) over structural CSS
2. Avoid fragile selectors (nth-child, complex class chains)
3. Use text content matching when appropriate
4. Always provide fallback strategies
5. Consider that the page might be dynamic

Response format (JSON only, no markdown):
{
  "primary": {
    "strategy": "css|xpath|text|role|testid|placeholder|label",
    "value": "selector-value"
  },
  "fallbacks": [
    {
      "strategy": "css|xpath|text|role|testid|placeholder|label",
      "value": "selector-value"
    }
  ],
  "confidence": 0.0-1.0,
  "reasoning": "Brief explanation of why this selector should work"
}`;
  }

  /**
   * Builds the refinement prompt with failure context
   */
  private buildRefinementPrompt(context: FailedSelectorContext): string {
    const triedSelectors = [
      `Primary: ${context.originalSelector.strategy}=${context.originalSelector.value}`,
      ...(context.triedFallbacks?.map((f, i) => `Fallback ${i + 1}: ${f.strategy}=${f.value}`) ||
        []),
    ].join('\n  ');

    return `## Failed Selector Analysis

**Action**: ${context.action}
**Element Description**: ${context.elementDescription || 'Not specified'}
**Page URL**: ${context.pageURL}

**Failed Selectors**:
  ${triedSelectors}

**Error**: ${context.error}

**Current Page HTML**:
\`\`\`html
${this.truncateHTML(context.pageHTML, 4000)}
\`\`\`

Analyze the HTML and suggest a better selector that will reliably find the element for this action.

Return ONLY valid JSON (no markdown, no code blocks):`;
  }

  /**
   * Parses the LLM response into a RefinedSelector
   */
  private parseRefinementResponse(content: string): RefinedSelector {
    // Clean up response - remove markdown code blocks if present
    let cleaned = content.trim();
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    try {
      const parsed = JSON.parse(cleaned);

      // Validate required fields
      if (!parsed.primary || !parsed.primary.strategy || !parsed.primary.value) {
        throw new Error('Missing required fields: primary.strategy and primary.value');
      }

      return {
        primary: {
          strategy: parsed.primary.strategy,
          value: parsed.primary.value,
        },
        fallbacks: parsed.fallbacks || [],
        confidence: parsed.confidence || 0.5,
        reasoning: parsed.reasoning || 'No reasoning provided',
      };
    } catch (error) {
      throw new Error(`Failed to parse LLM response: ${(error as Error).message}`);
    }
  }

  /**
   * Truncates HTML to fit within token limits
   */
  private truncateHTML(html: string, maxLength: number): string {
    if (html.length <= maxLength) {
      return html;
    }
    return html.substring(0, maxLength) + '\n\n<!-- [HTML truncated for brevity] -->';
  }
}
