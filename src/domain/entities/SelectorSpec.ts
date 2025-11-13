import { SelectorStrategy, isValidSelectorStrategy } from '../enums/SelectorStrategy';

/**
 * Metadata associated with a selector specification.
 */
export interface SelectorMetadata {
  confidence?: number;
  source?: string;
  timestamp?: Date;
  [key: string]: unknown;
}

/**
 * Fallback selector specification.
 */
export interface FallbackSelector {
  strategy: SelectorStrategy;
  value: string;
}

/**
 * Domain entity representing a selector specification with multi-strategy fallback support.
 * This is a core entity in the domain layer that encapsulates selector logic.
 */
export class SelectorSpec {
  public readonly strategy: SelectorStrategy;
  public readonly value: string;
  public readonly fallbacks: readonly FallbackSelector[];
  public readonly metadata?: SelectorMetadata;

  constructor(
    strategy: SelectorStrategy,
    value: string,
    fallbacks: FallbackSelector[] = [],
    metadata?: SelectorMetadata
  ) {
    // Validation
    if (!strategy || strategy.trim() === '') {
      throw new Error('Strategy cannot be empty');
    }

    if (!value || value.trim() === '') {
      throw new Error('Value cannot be empty');
    }

    if (!isValidSelectorStrategy(strategy)) {
      throw new Error(
        `Invalid selector strategy: ${strategy}. Must be one of: css, text, role, xpath, testid, placeholder`
      );
    }

    this.strategy = strategy;
    this.value = value;
    this.fallbacks = Object.freeze([...fallbacks]);
    this.metadata = metadata;
  }

  /**
   * Converts the selector specification to a Playwright-compatible selector string.
   */
  public toPlaywrightSelector(): string {
    switch (this.strategy) {
      case 'css':
        return this.value;
      case 'text':
        return `text=${this.value}`;
      case 'role':
        return `role=${this.value}`;
      case 'xpath':
        return `xpath=${this.value}`;
      case 'testid':
        return `[data-testid="${this.value}"]`;
      case 'placeholder':
        return `[placeholder="${this.value}"]`;
      default:
        // This should never happen due to validation, but TypeScript needs it
        throw new Error(`Unsupported strategy: ${this.strategy}`);
    }
  }

  /**
   * Compares this selector with another for equality.
   */
  public equals(other: SelectorSpec): boolean {
    return this.strategy === other.strategy && this.value === other.value;
  }

  /**
   * Creates a deep copy of this selector specification.
   */
  public clone(): SelectorSpec {
    return new SelectorSpec(
      this.strategy,
      this.value,
      this.fallbacks.map(f => ({ ...f })),
      this.metadata ? { ...this.metadata } : undefined
    );
  }

  /**
   * Returns a string representation of the selector.
   */
  public toString(): string {
    return `${this.strategy}:${this.value}`;
  }
}
