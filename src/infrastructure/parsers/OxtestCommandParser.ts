import { OxtestCommand } from '../../domain/entities/OxtestCommand';
import { SelectorSpec } from '../../domain/entities/SelectorSpec';
import { CommandType, isValidCommandType } from '../../domain/enums/CommandType';
import { SelectorStrategy } from '../../domain/enums/SelectorStrategy';
import { Token } from './OxtestTokenizer';

/**
 * Parses tokenized Oxtest commands into domain OxtestCommand entities.
 */
export class OxtestCommandParser {
  /**
   * Parses tokens into an OxtestCommand.
   *
   * @param tokens Array of tokens from tokenizer
   * @param lineNumber Line number for error messages
   * @returns Parsed OxtestCommand entity
   * @throws Error if parsing fails or validation fails
   */
  public parse(tokens: Token[], lineNumber: number): OxtestCommand {
    if (tokens.length === 0) {
      throw new Error(`Line ${lineNumber}: No tokens to parse`);
    }

    const commandToken = tokens[0];
    if (commandToken.type !== 'COMMAND') {
      throw new Error(`Line ${lineNumber}: Expected command token`);
    }

    const commandName = commandToken.value!;
    if (!isValidCommandType(commandName as CommandType)) {
      throw new Error(`Unknown command: ${commandName} at line ${lineNumber}`);
    }

    const selectorToken = tokens.find(t => t.type === 'SELECTOR');
    const paramTokens = tokens.filter(t => t.type === 'PARAM');

    const selector = selectorToken ? this.buildSelector(selectorToken) : undefined;
    const params = this.buildParams(paramTokens);

    this.validateCommand(commandName as CommandType, selector, params, lineNumber);

    return new OxtestCommand(commandName as CommandType, params, selector);
  }

  /**
   * Builds a SelectorSpec from a selector token (with fallbacks).
   */
  private buildSelector(token: Token): SelectorSpec {
    const strategy = token.strategy! as SelectorStrategy;
    const value = token.value!;

    let spec = new SelectorSpec(strategy, value);

    // Build fallback chain
    if (token.fallback) {
      const fallbackSpec = this.buildSelector(token.fallback);
      spec = new SelectorSpec(strategy, value, [
        {
          strategy: fallbackSpec.strategy,
          value: fallbackSpec.value,
        },
      ]);

      // Add nested fallbacks if any
      if (fallbackSpec.fallbacks && fallbackSpec.fallbacks.length > 0) {
        spec = new SelectorSpec(strategy, value, [
          {
            strategy: fallbackSpec.strategy,
            value: fallbackSpec.value,
          },
          ...fallbackSpec.fallbacks,
        ]);
      }
    }

    return spec;
  }

  /**
   * Builds command parameters from param tokens.
   */
  private buildParams(tokens: Token[]): Record<string, string> {
    const params: Record<string, string> = {};
    for (const token of tokens) {
      if (token.key) {
        params[token.key] = token.value!;
      }
    }
    return params;
  }

  /**
   * Validates command requirements (selectors, params).
   */
  private validateCommand(
    command: CommandType,
    selector: SelectorSpec | undefined,
    params: Record<string, string>,
    line: number
  ): void {
    // Commands that require selectors
    const needsSelector: CommandType[] = [
      'click',
      'fill',
      'hover',
      'assertVisible',
      'assertText',
      'assertValue',
      'waitForSelector',
    ];

    if (needsSelector.includes(command) && !selector) {
      throw new Error(`Line ${line}: ${command} requires a selector`);
    }

    // Validate required parameters
    if (command === 'navigate' && !params.url) {
      throw new Error(`Line ${line}: Missing required parameter: url`);
    }

    if (command === 'fill' && !params.value) {
      throw new Error(`Line ${line}: Missing required parameter: value for fill command`);
    }
  }
}
