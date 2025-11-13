import {
  CommandType,
  isValidCommandType,
  isInteractionCommand as isInteractionCommandType,
  isAssertionCommand as isAssertionCommandType,
  INTERACTION_COMMANDS,
} from '../enums/CommandType';
import { SelectorSpec } from './SelectorSpec';

/**
 * Parameters for a command execution.
 */
export interface CommandParams {
  url?: string;
  value?: string;
  expected?: string;
  ms?: number;
  force?: boolean;
  timeout?: number;
  [key: string]: unknown;
}

/**
 * Domain entity representing an Oxtest command.
 * Commands are the atomic operations in the Oxtest language.
 */
export class OxtestCommand {
  public readonly type: CommandType;
  public readonly params: CommandParams;
  public readonly selector?: SelectorSpec;

  constructor(type: CommandType, params: CommandParams, selector?: SelectorSpec) {
    // Validation
    if (!type || type.trim() === '') {
      throw new Error('Command type cannot be empty');
    }

    if (!isValidCommandType(type)) {
      throw new Error(`Invalid command type: ${type}. Must be a valid CommandType.`);
    }

    // Validate selector requirements
    if (INTERACTION_COMMANDS.includes(type) && !selector) {
      throw new Error(`Selector is required for ${type} commands`);
    }

    // Validate specific parameter requirements
    if (type === 'navigate' && !params.url) {
      throw new Error('url parameter is required for navigate commands');
    }

    if (type === 'fill' && !params.value) {
      throw new Error('value parameter is required for fill commands');
    }

    this.type = type;
    this.params = Object.freeze({ ...params });
    this.selector = selector;
  }

  /**
   * Checks if this is an interaction command (requires selector).
   */
  public isInteractionCommand(): boolean {
    return isInteractionCommandType(this.type);
  }

  /**
   * Checks if this is an assertion command.
   */
  public isAssertionCommand(): boolean {
    return isAssertionCommandType(this.type);
  }

  /**
   * Creates a deep copy of this command.
   */
  public clone(): OxtestCommand {
    return new OxtestCommand(
      this.type,
      { ...this.params },
      this.selector ? this.selector.clone() : undefined
    );
  }

  /**
   * Returns a string representation of the command.
   */
  public toString(): string {
    const parts: string[] = [this.type];

    if (this.selector) {
      parts.push(`(${this.selector.toString()}`);
      if (Object.keys(this.params).length > 0) {
        const paramStr = Object.entries(this.params)
          .map(([key, value]) => `${key}=${String(value)}`)
          .join(', ');
        parts.push(`, ${paramStr})`);
      } else {
        parts.push(')');
      }
    } else if (Object.keys(this.params).length > 0) {
      const paramStr = Object.entries(this.params)
        .map(([key, value]) => `${key}=${String(value)}`)
        .join(', ');
      parts.push(`(${paramStr})`);
    }

    return parts.join('');
  }
}
