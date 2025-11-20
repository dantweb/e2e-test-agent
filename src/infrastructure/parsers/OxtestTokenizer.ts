/**
 * Token types for Oxtest language parsing.
 */
export type TokenType = 'COMMAND' | 'SELECTOR' | 'PARAM';

/**
 * Represents a token in the Oxtest language.
 */
export interface Token {
  readonly type: TokenType;
  readonly value?: string;
  readonly key?: string;
  readonly strategy?: string;
  readonly fallback?: Token;
}

/**
 * Tokenizes Oxtest command lines into structured tokens.
 *
 * Handles:
 * - Command names
 * - Selector strategies (css, xpath, text, etc.)
 * - Parameters (key=value pairs)
 * - Fallback selectors
 * - Quoted values with spaces
 * - Comments and empty lines
 */
export class OxtestTokenizer {
  private readonly selectorStrategies = [
    'css',
    'xpath',
    'text',
    'placeholder',
    'label',
    'role',
    'testid',
  ];

  /**
   * Tokenizes a single line of Oxtest code.
   *
   * @param line The line to tokenize
   * @returns Array of tokens (empty for comments/blank lines)
   */
  public tokenize(line: string): Token[] {
    const trimmed = line.trim();

    // Skip empty lines and comments
    if (!trimmed || trimmed.startsWith('#')) {
      return [];
    }

    const tokens: Token[] = [];
    const parts = this.splitLine(trimmed);

    // First part is always the command (normalize snake_case to camelCase)
    const commandName = this.normalizeCommandName(parts[0]);
    tokens.push({ type: 'COMMAND', value: commandName });

    // Process remaining parts
    let i = 1;
    while (i < parts.length) {
      const part = parts[i];

      if (this.isSelectorToken(part)) {
        const { token, consumed } = this.parseSelector(parts, i);
        tokens.push(token);
        i += consumed;
      } else if (this.isParamToken(part)) {
        tokens.push(this.parseParam(part));
        i++;
      } else {
        // Unknown token, skip
        i++;
      }
    }

    return tokens;
  }

  /**
   * Splits a line into parts, respecting quoted strings.
   */
  private splitLine(line: string): string[] {
    const parts: string[] = [];
    let current = '';
    let inQuotes = false;
    let quoteChar = '';
    let escaped = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (escaped) {
        current += char;
        escaped = false;
        continue;
      }

      if (char === '\\') {
        escaped = true;
        continue;
      }

      if (char === '"' || char === "'") {
        if (!inQuotes) {
          inQuotes = true;
          quoteChar = char;
        } else if (char === quoteChar) {
          inQuotes = false;
          quoteChar = '';
        } else {
          current += char;
        }
        continue;
      }

      if (char === ' ' && !inQuotes) {
        if (current) {
          parts.push(current);
          current = '';
        }
      } else {
        current += char;
      }
    }

    if (current) {
      parts.push(current);
    }

    return parts;
  }

  /**
   * Checks if a part is a selector token (e.g., css=value).
   */
  private isSelectorToken(part: string): boolean {
    return this.selectorStrategies.some(s => part.startsWith(`${s}=`));
  }

  /**
   * Checks if a part is a parameter token (e.g., key=value).
   */
  private isParamToken(part: string): boolean {
    return part.includes('=') && !this.isSelectorToken(part) && part !== 'fallback';
  }

  /**
   * Parses a selector token with optional fallback.
   * Returns the token and the number of parts consumed.
   */
  private parseSelector(parts: string[], index: number): { token: Token; consumed: number } {
    const part = parts[index];
    const [strategy, ...valueParts] = part.split('=');
    const value = valueParts.join('='); // Handle = in selector values

    let consumed = 1;
    let fallbackToken: Token | undefined;

    // Check for fallback - supports both "fallback css=..." and "fallback=css=..."
    if (index + 1 < parts.length) {
      const nextPart = parts[index + 1];

      // Format 1: "fallback css=..."
      if (nextPart === 'fallback') {
        if (index + 2 < parts.length && this.isSelectorToken(parts[index + 2])) {
          const fallbackResult = this.parseSelector(parts, index + 2);
          fallbackToken = fallbackResult.token;
          consumed += 2 + (fallbackResult.consumed - 1); // "fallback" keyword + selector + any nested fallbacks
        }
      }
      // Format 2: "fallback=css=..."
      else if (nextPart.startsWith('fallback=')) {
        const fallbackSelector = nextPart.substring('fallback='.length);
        if (this.isSelectorToken(fallbackSelector)) {
          // Parse the fallback selector inline
          const [fbStrategy, ...fbValueParts] = fallbackSelector.split('=');
          const fbValue = fbValueParts.join('=');
          fallbackToken = {
            type: 'SELECTOR',
            strategy: fbStrategy,
            value: fbValue,
          };
          consumed += 1;
        }
      }
    }

    const token: Token = {
      type: 'SELECTOR',
      strategy,
      value,
    };

    if (fallbackToken) {
      return {
        token: { ...token, fallback: fallbackToken },
        consumed,
      };
    }

    return { token, consumed };
  }

  /**
   * Parses a parameter token (key=value).
   */
  private parseParam(part: string): Token {
    const [key, ...valueParts] = part.split('=');
    return {
      type: 'PARAM',
      key,
      value: valueParts.join('='), // Handle = in values
    };
  }

  /**
   * Normalizes command names from snake_case to camelCase.
   * Examples: assert_exists -> assertExists, wait_for -> waitForSelector
   */
  private normalizeCommandName(command: string): string {
    // Map of snake_case to camelCase command names
    const commandMap: Record<string, string> = {
      assert_exists: 'assertVisible', // assert_exists checks if visible
      assert_not_exists: 'assertHidden', // assert_not_exists checks if hidden
      assert_visible: 'assertVisible',
      assert_hidden: 'assertHidden',
      assert_text: 'assertText',
      assert_value: 'assertValue',
      assert_enabled: 'assertEnabled',
      assert_disabled: 'assertDisabled',
      assert_checked: 'assertChecked',
      assert_unchecked: 'assertUnchecked',
      assert_url: 'assertUrl',
      assert_title: 'assertTitle',
      wait_for: 'waitForSelector',
      wait_navigation: 'wait', // wait_navigation maps to wait
      go_back: 'goBack',
      go_forward: 'goForward',
      select_option: 'selectOption',
      set_viewport: 'setViewport',
    };

    return commandMap[command] || command;
  }
}
