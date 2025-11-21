import { Browser, Page, chromium } from 'playwright';
import { OxtestCommand } from '../../domain/entities/OxtestCommand';
import { MultiStrategySelector } from './MultiStrategySelector';
import {
  SelectorRefinementService,
  FailedSelectorContext,
} from '../../application/services/SelectorRefinementService';
import { ILLMProvider } from '../llm/interfaces';
import { SelectorStrategy, isValidSelectorStrategy } from '../../domain/enums/SelectorStrategy';
import { FallbackSelector, SelectorSpec } from '../../domain/entities/SelectorSpec';

/**
 * Result of command execution.
 */
export interface ExecutionResult {
  success: boolean;
  error?: string;
  duration: number;
  refined?: boolean; // True if selector was refined during execution
  refinedCommand?: OxtestCommand; // The refined command if refinement occurred
}

/**
 * Executes Oxtest commands using Playwright.
 */
export class PlaywrightExecutor {
  private browser?: Browser;
  private page?: Page;
  private readonly selector: MultiStrategySelector;
  private readonly refinementService?: SelectorRefinementService;
  private verbose: boolean = false;

  constructor(verbose: boolean = false, llmProvider?: ILLMProvider) {
    this.selector = new MultiStrategySelector();
    this.verbose = verbose;
    this.selector.setVerbose(verbose);

    // Initialize refinement service if LLM provider is available
    if (llmProvider) {
      this.refinementService = new SelectorRefinementService(llmProvider);
    }
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
      const result = await this.executeCommand(command, this.page);
      return {
        success: true,
        duration: Date.now() - startTime,
        refined: result.refined,
        refinedCommand: result.refinedCommand,
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
  private async executeCommand(
    command: OxtestCommand,
    page: Page
  ): Promise<{ refined: boolean; refinedCommand?: OxtestCommand }> {
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
        return { refined: false }; // Success without refinement
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

    // If selector refinement is available and this is a selector-based command, try to refine
    if (this.refinementService && command.selector && this.isElementNotFoundError(lastError!)) {
      if (this.verbose) {
        console.log(`      🔧 Attempting selector refinement with LLM...`);
      }

      try {
        const refinedCommand = await this.refineCommandSelector(command, page, lastError!);

        if (this.verbose) {
          console.log(
            `      🎯 Trying refined selector: ${refinedCommand.selector!.strategy}=${refinedCommand.selector!.value}`
          );
        }

        // Try the refined command
        await this.executeCommandOnce(refinedCommand, page);

        if (this.verbose) {
          console.log(`      ✅ Refined selector succeeded!`);
        }
        return { refined: true, refinedCommand }; // Success with refinement
      } catch (refinementError) {
        if (this.verbose) {
          console.log(
            `      ❌ Refined selector also failed: ${(refinementError as Error).message}`
          );
        }
        // Fall through to throw original error
      }
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

  /**
   * Checks if an error is related to element not found.
   */
  private isElementNotFoundError(error: Error): boolean {
    const message = error.message.toLowerCase();
    return (
      message.includes('element not found') ||
      message.includes('timeout') ||
      message.includes('locator.waitfor') ||
      message.includes('waiting for selector')
    );
  }

  /**
   * Refines a command's selector using LLM analysis of current page HTML.
   */
  private async refineCommandSelector(
    command: OxtestCommand,
    page: Page,
    error: Error
  ): Promise<OxtestCommand> {
    if (!this.refinementService || !command.selector) {
      throw new Error('Cannot refine selector: missing service or selector');
    }

    if (this.verbose) {
      console.log(`      📊 Extracting current page HTML...`);
    }

    // Extract simplified HTML from current page
    const pageHTML = await this.refinementService.extractPageHTML(page);

    if (this.verbose) {
      console.log(`      📄 HTML extracted: ${pageHTML.length} characters`);
      console.log(`      🤖 Asking LLM for better selector...`);
    }

    // Build context for LLM - convert readonly fallbacks to plain objects
    const triedFallbacks =
      command.selector.fallbacks?.map(fb => ({
        strategy: fb.strategy,
        value: fb.value,
      })) || [];

    const context: FailedSelectorContext = {
      originalSelector: {
        strategy: command.selector.strategy,
        value: command.selector.value,
      },
      triedFallbacks,
      error: error.message,
      pageURL: page.url(),
      pageHTML,
      action: command.type,
      elementDescription: this.getElementDescription(command),
    };

    // Get refined selector from LLM
    const refined = await this.refinementService.refineSelector(context);

    if (this.verbose) {
      console.log(`      💡 LLM suggests: ${refined.primary.strategy}=${refined.primary.value}`);
      console.log(`      🎯 Confidence: ${(refined.confidence * 100).toFixed(0)}%`);
      console.log(`      📝 Reasoning: ${refined.reasoning}`);
      if (refined.fallbacks.length > 0) {
        console.log(`      🔄 With ${refined.fallbacks.length} fallback(s)`);
      }
    }

    // Validate and convert primary selector strategy
    if (!isValidSelectorStrategy(refined.primary.strategy)) {
      throw new Error(`Invalid selector strategy from LLM: ${refined.primary.strategy}`);
    }

    // Validate and convert fallback selector strategies
    const validatedFallbacks: FallbackSelector[] = refined.fallbacks
      .filter(fb => {
        if (!isValidSelectorStrategy(fb.strategy)) {
          if (this.verbose) {
            console.log(`      ⚠️  Skipping invalid fallback strategy: ${fb.strategy}`);
          }
          return false;
        }
        return true;
      })
      .map(fb => ({
        strategy: fb.strategy as SelectorStrategy,
        value: fb.value,
      }));

    // Create a new SelectorSpec with refined selector
    const refinedSelector = new SelectorSpec(
      refined.primary.strategy as SelectorStrategy,
      refined.primary.value,
      validatedFallbacks
    );

    // Create a new command with refined selector
    return new OxtestCommand(command.type, command.params, refinedSelector);
  }

  /**
   * Gets a human-readable description of what element we're looking for.
   */
  private getElementDescription(command: OxtestCommand): string {
    switch (command.type) {
      case 'click':
        return 'clickable element (button, link, or interactive element)';
      case 'fill':
      case 'type':
        return 'input field or text area';
      case 'hover':
        return 'hoverable element';
      case 'waitForSelector':
      case 'assertVisible':
        return 'visible element';
      case 'assertText':
        return `element containing text "${command.params.value}"`;
      default:
        return 'element';
    }
  }
}
