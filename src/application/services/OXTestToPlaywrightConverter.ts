/**
 * OXTestToPlaywrightConverter - Converts validated OXTest to Playwright code
 *
 * Single Responsibility: OXTest → Playwright conversion
 * Open/Closed: Can be extended with different conversion strategies
 * Liskov Substitution: Can be replaced with alternative converters
 *
 * Converts proven, validated OXTest selectors and commands into
 * production-ready Playwright TypeScript code.
 */

import { OxtestParser } from '../../infrastructure/parsers/OxtestParser';
import { OxtestCommand } from '../../domain/entities/OxtestCommand';

/**
 * Options for conversion
 */
export interface ConversionOptions {
  /** Test name */
  testName: string;

  /** Base URL for the test */
  baseURL: string;

  /** Enable verbose logging */
  verbose?: boolean;

  /** Add extra assertions */
  extraAssertions?: boolean;
}

/**
 * Result of conversion
 */
export interface ConversionResult {
  /** Generated Playwright TypeScript code */
  code: string;

  /** Number of commands converted */
  commandsConverted: number;

  /** Any warnings during conversion */
  warnings: string[];
}

/**
 * Service for converting OXTest to Playwright
 */
export class OXTestToPlaywrightConverter {
  private readonly parser: OxtestParser;

  constructor() {
    this.parser = new OxtestParser();
  }

  /**
   * Converts OXTest content to Playwright TypeScript code
   *
   * @param oxtestContent Validated OXTest content
   * @param options Conversion options
   * @returns Conversion result
   */
  async convert(oxtestContent: string, options: ConversionOptions): Promise<ConversionResult> {
    const warnings: string[] = [];

    try {
      // Parse OXTest
      const commands = await this.parser.parseContent(oxtestContent);

      if (commands.length === 0) {
        warnings.push('No commands found in OXTest');
      }

      // Generate Playwright code
      const imports = this.generateImports();
      const testFunction = this.generateTestFunction(commands, options);

      const code = `${imports}\n\n${testFunction}`;

      if (options.verbose) {
        console.log(`   ✅ Converted ${commands.length} OXTest commands to Playwright`);
      }

      return {
        code,
        commandsConverted: commands.length,
        warnings,
      };
    } catch (error) {
      warnings.push(`Conversion error: ${(error as Error).message}`);

      // Return minimal valid Playwright code
      return {
        code: this.generateFallbackCode(options),
        commandsConverted: 0,
        warnings,
      };
    }
  }

  /**
   * Generates import statements
   */
  private generateImports(): string {
    return `import { test, expect } from '@playwright/test';`;
  }

  /**
   * Generates the test function with converted commands
   */
  private generateTestFunction(
    commands: readonly OxtestCommand[],
    options: ConversionOptions
  ): string {
    const lines: string[] = [];

    lines.push(`test('${options.testName}', async ({ page }) => {`);
    lines.push(`  // Generated from validated OXTest`);
    lines.push('');

    for (const command of commands) {
      const converted = this.convertCommand(command);
      if (converted) {
        // Add comment for each step
        lines.push(`  // ${command.type}`);
        lines.push(`  ${converted}`);
        lines.push('');
      }
    }

    lines.push('});');

    return lines.join('\n');
  }

  /**
   * Converts a single OXTest command to Playwright code
   */
  private convertCommand(command: OxtestCommand): string | null {
    switch (command.type) {
      case 'navigate':
        return `await page.goto('${command.params.url}');`;

      case 'click':
        if (command.selector) {
          const locator = this.convertSelector(command.selector.strategy, command.selector.value);
          return `await ${locator}.click();`;
        }
        return null;

      case 'type':
      case 'fill':
        if (command.selector && command.params.value) {
          const locator = this.convertSelector(command.selector.strategy, command.selector.value);
          return `await ${locator}.fill('${this.escapeString(String(command.params.value))}');`;
        }
        return null;

      case 'hover':
        if (command.selector) {
          const locator = this.convertSelector(command.selector.strategy, command.selector.value);
          return `await ${locator}.hover();`;
        }
        return null;

      case 'press':
        if (command.selector) {
          const locator = this.convertSelector(command.selector.strategy, command.selector.value);
          const key = command.params.key || 'Enter';
          return `await ${locator}.press('${key}');`;
        }
        return null;

      case 'wait':
        const timeout = command.params.timeout || 1000;
        return `await page.waitForTimeout(${timeout});`;

      case 'waitForSelector':
        if (command.selector) {
          const locator = this.convertSelector(command.selector.strategy, command.selector.value);
          return `await ${locator}.waitFor({ state: 'visible' });`;
        }
        return null;

      case 'assertVisible':
        if (command.selector) {
          const locator = this.convertSelector(command.selector.strategy, command.selector.value);
          return `await expect(${locator}).toBeVisible();`;
        }
        return null;

      case 'assertText':
        if (command.selector && command.params.value) {
          const locator = this.convertSelector(command.selector.strategy, command.selector.value);
          return `await expect(${locator}).toHaveText('${this.escapeString(String(command.params.value))}');`;
        }
        return null;

      case 'assertUrl':
        if (command.params.pattern) {
          const pattern = String(command.params.pattern);
          return `expect(page.url()).toMatch(/${this.escapeRegex(pattern)}/);`;
        }
        return null;

      default:
        return `// Unsupported command: ${command.type}`;
    }
  }

  /**
   * Converts a selector to Playwright locator syntax
   */
  private convertSelector(strategy: string, value: string): string {
    switch (strategy) {
      case 'css':
        return `page.locator('${this.escapeString(value)}')`;

      case 'xpath':
        return `page.locator('xpath=${this.escapeString(value)}')`;

      case 'text':
        return `page.getByText('${this.escapeString(value)}')`;

      case 'role':
        return `page.getByRole('${value}')`;

      case 'testid':
        return `page.getByTestId('${this.escapeString(value)}')`;

      case 'placeholder':
        return `page.getByPlaceholder('${this.escapeString(value)}')`;

      case 'label':
        return `page.getByLabel('${this.escapeString(value)}')`;

      default:
        return `page.locator('${this.escapeString(value)}')`;
    }
  }

  /**
   * Escapes a string for use in JavaScript/TypeScript
   */
  private escapeString(str: string): string {
    return str
      .replace(/\\/g, '\\\\')
      .replace(/'/g, "\\'")
      .replace(/"/g, '\\"')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/\t/g, '\\t');
  }

  /**
   * Escapes a string for use in regex
   */
  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Generates fallback code when conversion fails
   */
  private generateFallbackCode(options: ConversionOptions): string {
    return `import { test, expect } from '@playwright/test';

test('${options.testName}', async ({ page }) => {
  // Conversion failed - manual implementation required
  await page.goto('${options.baseURL}');

  // TODO: Implement test steps
});
`;
  }
}
