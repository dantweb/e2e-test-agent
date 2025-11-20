import { Browser, Page, chromium } from 'playwright';
import { OxtestCommand } from '../../domain/entities/OxtestCommand';
import { MultiStrategySelector } from './MultiStrategySelector';

/**
 * Result of command execution.
 */
export interface ExecutionResult {
  success: boolean;
  error?: string;
  duration: number;
}

/**
 * Executes Oxtest commands using Playwright.
 */
export class PlaywrightExecutor {
  private browser?: Browser;
  private page?: Page;
  private readonly selector: MultiStrategySelector;
  private verbose: boolean = false;

  constructor(verbose: boolean = false) {
    this.selector = new MultiStrategySelector();
    this.verbose = verbose;
    this.selector.setVerbose(verbose);
  }

  /**
   * Enable or disable verbose logging.
   */
  public setVerbose(verbose: boolean): void {
    this.verbose = verbose;
    this.selector.setVerbose(verbose);
  }

  /**
   * Initializes the browser and page.
   */
  public async initialize(): Promise<void> {
    this.browser = await chromium.launch({ headless: true });
    const context = await this.browser.newContext();
    this.page = await context.newPage();
  }

  /**
   * Closes the browser.
   */
  public async close(): Promise<void> {
    if (this.page) {
      await this.page.close();
    }
    if (this.browser) {
      await this.browser.close();
    }
  }

  /**
   * Executes a single Oxtest command.
   */
  public async execute(command: OxtestCommand): Promise<ExecutionResult> {
    if (!this.page) {
      throw new Error('Executor not initialized. Call initialize() first.');
    }

    const startTime = Date.now();

    try {
      await this.executeCommand(command, this.page);
      return {
        success: true,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message,
        duration: Date.now() - startTime,
      };
    }
  }

  /**
   * Executes multiple commands in sequence.
   */
  public async executeAll(commands: readonly OxtestCommand[]): Promise<ExecutionResult[]> {
    const results: ExecutionResult[] = [];

    for (const command of commands) {
      const result = await this.execute(command);
      results.push(result);

      // Stop on first failure
      if (!result.success) {
        break;
      }
    }

    return results;
  }

  /**
   * Executes a single command with retry logic.
   */
  private async executeCommand(command: OxtestCommand, page: Page): Promise<void> {
    const maxRetries = 3;
    let lastError: Error | undefined;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        if (this.verbose && attempt > 0) {
          console.log(`      🔄 Retry attempt ${attempt + 1}/${maxRetries} for: ${command.type}`);
        }
        await this.executeCommandOnce(command, page);
        if (this.verbose) {
          console.log(`      ✅ Command executed successfully: ${command.type}`);
        }
        return; // Success
      } catch (error) {
        lastError = error as Error;
        if (this.verbose) {
          console.log(`      ❌ Attempt ${attempt + 1} failed: ${lastError.message}`);
        }
        if (attempt < maxRetries - 1) {
          if (this.verbose) {
            console.log(`      ⏳ Waiting 1s before retry...`);
          }
          await page.waitForTimeout(1000); // Wait before retry
        }
      }
    }

    if (this.verbose) {
      console.log(`      ⛔ All ${maxRetries} attempts failed`);
    }
    throw lastError;
  }

  /**
   * Executes a command once (no retry).
   */
  private async executeCommandOnce(command: OxtestCommand, page: Page): Promise<void> {
    switch (command.type) {
      case 'navigate':
        await page.goto(command.params.url!);
        break;

      case 'click':
        if (command.selector) {
          const locator = await this.selector.locate(page, command.selector);
          await locator.click();
        }
        break;

      case 'fill':
        if (command.selector) {
          const locator = await this.selector.locate(page, command.selector);
          await locator.fill(command.params.value!);
        }
        break;

      case 'type':
        if (command.selector) {
          const locator = await this.selector.locate(page, command.selector);
          await locator.type(command.params.value!);
        }
        break;

      case 'press':
        if (command.selector) {
          const locator = await this.selector.locate(page, command.selector);
          await locator.press(String(command.params.key || 'Enter'));
        }
        break;

      case 'hover':
        if (command.selector) {
          const locator = await this.selector.locate(page, command.selector);
          await locator.hover();
        }
        break;

      case 'wait':
        const timeout =
          typeof command.params.timeout === 'number'
            ? command.params.timeout
            : parseInt(String(command.params.timeout || '1000'));
        await page.waitForTimeout(timeout);
        break;

      case 'waitForSelector':
        if (command.selector) {
          await this.selector.locate(page, command.selector);
        }
        break;

      case 'assertVisible':
        if (command.selector) {
          const locator = await this.selector.locate(page, command.selector);
          await locator.waitFor({ state: 'visible' });
        }
        break;

      case 'assertText':
        if (command.selector) {
          const locator = await this.selector.locate(page, command.selector);
          const text = await locator.textContent();
          const expected = command.params.value;
          if (text !== expected) {
            throw new Error(`Expected text "${expected}", got "${text}"`);
          }
        }
        break;

      case 'assertUrl':
        const pattern = String(command.params.pattern || '');
        const url = page.url();
        if (pattern && !new RegExp(pattern).test(url)) {
          throw new Error(`URL ${url} does not match pattern ${pattern}`);
        }
        break;

      default:
        throw new Error(`Unsupported command type: ${command.type}`);
    }
  }
}
