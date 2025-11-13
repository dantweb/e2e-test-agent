import { PlaywrightExecutor } from '../../infrastructure/executors/PlaywrightExecutor';
import { OxtestCommand } from '../../domain/entities/OxtestCommand';
import { SelectorSpec } from '../../domain/entities/SelectorSpec';

/**
 * Validation type for predicate validation.
 */
export type ValidationType = 'exists' | 'not_exists' | 'visible' | 'text' | 'value' | 'url';

/**
 * Validation predicate definition.
 */
export interface ValidationPredicate {
  type: ValidationType;
  selector?: SelectorSpec;
  expected?: string;
  pattern?: string;
  description: string;
}

/**
 * Result of a validation check.
 */
export interface ValidationResult {
  description: string;
  passed: boolean;
  error?: string;
}

/**
 * Engine for validating predicates after test execution.
 * Converts validation predicates into assertion commands and executes them.
 */
export class PredicateValidationEngine {
  constructor(private readonly executor: PlaywrightExecutor) {}

  /**
   * Validates that an element exists.
   * @param selector Element selector
   * @param description Validation description
   * @returns Validation result
   */
  public async validateExists(selector: SelectorSpec, description: string): Promise<ValidationResult> {
    return this.executeValidation({ type: 'exists', selector, description });
  }

  /**
   * Validates that an element does not exist.
   * @param selector Element selector
   * @param description Validation description
   * @returns Validation result
   */
  public async validateNotExists(selector: SelectorSpec, description: string): Promise<ValidationResult> {
    return this.executeValidation({ type: 'not_exists', selector, description });
  }

  /**
   * Validates that an element is visible.
   * @param selector Element selector
   * @param description Validation description
   * @returns Validation result
   */
  public async validateVisible(selector: SelectorSpec, description: string): Promise<ValidationResult> {
    return this.executeValidation({ type: 'visible', selector, description });
  }

  /**
   * Validates that an element's text matches expected value.
   * @param selector Element selector
   * @param expected Expected text
   * @param description Validation description
   * @returns Validation result
   */
  public async validateText(
    selector: SelectorSpec,
    expected: string,
    description: string
  ): Promise<ValidationResult> {
    return this.executeValidation({ type: 'text', selector, expected, description });
  }

  /**
   * Validates that an input's value matches expected value.
   * @param selector Element selector
   * @param expected Expected value
   * @param description Validation description
   * @returns Validation result
   */
  public async validateValue(
    selector: SelectorSpec,
    expected: string,
    description: string
  ): Promise<ValidationResult> {
    return this.executeValidation({ type: 'value', selector, expected, description });
  }

  /**
   * Validates that the current URL matches a pattern.
   * @param pattern URL pattern (regex)
   * @param description Validation description
   * @returns Validation result
   */
  public async validateUrl(pattern: string, description: string): Promise<ValidationResult> {
    return this.executeValidation({ type: 'url', pattern, description });
  }

  /**
   * Validates multiple predicates in sequence.
   * @param validations Array of validation predicates
   * @returns Array of validation results
   */
  public async validateAll(validations: readonly ValidationPredicate[]): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];

    for (const validation of validations) {
      const result = await this.executeValidation(validation);
      results.push(result);
    }

    return results;
  }

  /**
   * Executes a single validation predicate.
   * @param predicate Validation predicate to execute
   * @returns Validation result
   */
  private async executeValidation(predicate: ValidationPredicate): Promise<ValidationResult> {
    try {
      const command = this.buildCommand(predicate);
      const result = await this.executor.execute(command);

      return {
        description: predicate.description,
        passed: result.success,
        error: result.error,
      };
    } catch (error) {
      return {
        description: predicate.description,
        passed: false,
        error: (error as Error).message,
      };
    }
  }

  /**
   * Builds an OxtestCommand from a validation predicate.
   * @param predicate Validation predicate
   * @returns Oxtest command for assertion
   */
  private buildCommand(predicate: ValidationPredicate): OxtestCommand {
    switch (predicate.type) {
      case 'exists':
        if (!predicate.selector) {
          throw new Error('Selector is required for exists validation');
        }
        return new OxtestCommand('assertVisible', {}, predicate.selector);

      case 'not_exists':
        if (!predicate.selector) {
          throw new Error('Selector is required for not_exists validation');
        }
        return new OxtestCommand('assertHidden', {}, predicate.selector);

      case 'visible':
        if (!predicate.selector) {
          throw new Error('Selector is required for visible validation');
        }
        return new OxtestCommand('assertVisible', {}, predicate.selector);

      case 'text':
        if (!predicate.selector) {
          throw new Error('Selector is required for text validation');
        }
        return new OxtestCommand(
          'assertText',
          { expected: predicate.expected || '' },
          predicate.selector
        );

      case 'value':
        if (!predicate.selector) {
          throw new Error('Selector is required for value validation');
        }
        return new OxtestCommand(
          'assertValue',
          { expected: predicate.expected || '' },
          predicate.selector
        );

      case 'url':
        return new OxtestCommand('assertUrl', { pattern: predicate.pattern || '' });

      default:
        throw new Error(`Unknown validation type: ${(predicate as any).type}`);
    }
  }
}
