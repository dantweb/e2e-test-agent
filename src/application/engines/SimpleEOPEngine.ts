/**
 * Simple Execute-Observe-Plan Engine
 * Minimal implementation that executes commands immediately during generation
 * to keep HTML fresh for next command generation.
 */

import type { IHTMLExtractor } from '../interfaces/IHTMLExtractor';
import type { ILLMProvider } from '../../infrastructure/llm/interfaces';
import type { OxtestPromptBuilder } from '../../infrastructure/llm/OxtestPromptBuilder';
import type { OxtestParser } from '../../infrastructure/parsers/OxtestParser';
import type { LanguageDetectionService } from '../services/LanguageDetectionService';
import { Subtask } from '../../domain/entities/Subtask';
import { OxtestCommand } from '../../domain/entities/OxtestCommand';
import type { Page } from 'playwright';

export interface SimpleEOPOptions {
  verbose?: boolean;
  maxIterations?: number;
  model?: string;
}

/**
 * Simplified EOP: Generate command → Execute immediately → Refresh HTML → Repeat
 * This keeps HTML fresh so each command sees current page state.
 */
export class SimpleEOPEngine {
  constructor(
    private htmlExtractor: IHTMLExtractor,
    private llmProvider: ILLMProvider,
    private promptBuilder: OxtestPromptBuilder,
    private oxtestParser: OxtestParser,
    private languageDetector: LanguageDetectionService,
    private page: Page,
    private options: SimpleEOPOptions = {}
  ) {}

  private get verbose(): boolean {
    return this.options.verbose ?? false;
  }

  private get model(): string {
    return this.options.model ?? 'gpt-4o';
  }

  /**
   * Decompose with Execute-Observe-Plan pattern
   */
  public async decompose(instruction: string): Promise<Subtask> {
    const commands: OxtestCommand[] = [];
    const maxIterations = this.options.maxIterations ?? 10;

    for (let iteration = 0; iteration < maxIterations; iteration++) {
      if (this.verbose) {
        console.log(`\n   🔄 EOP Iteration ${iteration + 1}/${maxIterations}`);
      }

      // OBSERVE: Get fresh HTML from current page state
      const html = await this.htmlExtractor.extractSimplified();
      if (this.verbose) {
        console.log(`   👀 Observed: ${html.length} chars HTML`);
      }

      // PLAN: Generate next command using current HTML
      const command = await this.generateNextCommand(instruction, html, commands);

      if (!command) {
        if (this.verbose) {
          console.log(`   ⏹️  No more commands to generate`);
        }
        break;
      }

      // Stop if we get a wait command and already have some commands
      if (command.type === 'wait' && commands.length > 0) {
        if (this.verbose) {
          console.log(`   ⏹️  Wait command received, stopping`);
        }
        break;
      }

      commands.push(command);

      if (this.verbose) {
        console.log(
          `   ✓ Generated: ${command.type} ${command.selector ? `${command.selector.strategy}=${command.selector.value}` : ''}`
        );
      }

      // EXECUTE: Run command immediately (updates page state)
      if (command.type !== 'wait') {
        const executed = await this.executeCommand(command);
        if (!executed) {
          if (this.verbose) {
            console.log(`   ⚠️  Execution failed, continuing anyway`);
          }
        }
      }

      // Small delay for DOM to stabilize
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    return new Subtask(`eop-${Date.now()}`, instruction, commands);
  }

  /**
   * Generate next command with current page HTML
   */
  private async generateNextCommand(
    instruction: string,
    html: string,
    executedCommands: OxtestCommand[]
  ): Promise<OxtestCommand | null> {
    // Detect language
    const language = this.languageDetector.detectLanguage(html);
    const languageContext = this.languageDetector.getLanguageContext(language);

    // Build prompt with current HTML and history
    const systemPrompt = this.promptBuilder.buildSystemPrompt();
    const userPrompt = this.buildPromptWithHistory(
      instruction,
      html,
      executedCommands,
      languageContext
    );

    if (this.verbose) {
      console.log(`   🤖 Requesting next command from LLM...`);
    }

    // Generate command
    const response = await this.llmProvider.generate(userPrompt, {
      systemPrompt,
      model: this.model,
    });

    // Check for completion signal
    if (response.content.toUpperCase().includes('COMPLETE')) {
      if (this.verbose) {
        console.log(`   ✅ LLM signaled completion`);
      }
      return null;
    }

    // Parse commands
    try {
      const commands = this.oxtestParser.parseContent(response.content);
      if (commands.length === 0) {
        if (this.verbose) {
          console.log(`   ⚠️  No parseable commands in LLM response`);
        }
        return null;
      }
      return commands[0];
    } catch (error) {
      if (this.verbose) {
        console.log(`   ⚠️  Parse error: ${(error as Error).message}`);
      }
      return null;
    }
  }

  /**
   * Execute command on actual page
   */
  private async executeCommand(command: OxtestCommand): Promise<boolean> {
    try {
      if (this.verbose) {
        console.log(`   ⚡ Executing: ${command.type}`);
      }

      switch (command.type) {
        case 'click':
          if (command.selector) {
            await this.clickElement(command.selector.strategy, command.selector.value);
          }
          break;

        case 'type':
        case 'fill':
          if (command.selector && command.params.value) {
            await this.typeIntoElement(
              command.selector.strategy,
              command.selector.value,
              command.params.value as string
            );
          }
          break;

        case 'navigate':
          if (command.params.url) {
            await this.page.goto(command.params.url);
          }
          break;

        // Skip other commands for now
        default:
          return true;
      }

      return true;
    } catch (error) {
      if (this.verbose) {
        console.log(`   ❌ Execution error: ${(error as Error).message}`);
      }
      return false;
    }
  }

  /**
   * Click element by selector
   */
  private async clickElement(strategy: string, value: string): Promise<void> {
    const selector = this.buildPlaywrightSelector(strategy, value);
    await this.page.click(selector, { timeout: 5000 });
    await this.page.waitForLoadState('networkidle', { timeout: 2000 }).catch(() => {});
  }

  /**
   * Type into element
   */
  private async typeIntoElement(
    strategy: string,
    selectorValue: string,
    text: string
  ): Promise<void> {
    const selector = this.buildPlaywrightSelector(strategy, selectorValue);
    await this.page.fill(selector, text, { timeout: 5000 });
  }

  /**
   * Build Playwright selector from OXTest selector
   */
  private buildPlaywrightSelector(strategy: string, value: string): string {
    switch (strategy) {
      case 'css':
        return value;
      case 'text':
        return `text="${value}"`;
      case 'placeholder':
        return `[placeholder="${value}"]`;
      case 'xpath':
        return value;
      default:
        return value;
    }
  }

  /**
   * Build prompt with execution history
   */
  private buildPromptWithHistory(
    instruction: string,
    html: string,
    executedCommands: OxtestCommand[],
    languageContext?: string
  ): string {
    const historyText =
      executedCommands.length > 0
        ? `\n\nCommands executed so far:\n${executedCommands.map((cmd, i) => `${i + 1}. ${cmd.type} ${cmd.selector ? `${cmd.selector.strategy}=${cmd.selector.value}` : ''}`).join('\n')}`
        : '';

    const languagePrefix = languageContext ? `${languageContext}\n\n` : '';

    return `${languagePrefix}Generate the NEXT single OXTest command for this instruction:

Instruction: ${instruction}

Current page HTML (after ${executedCommands.length} commands executed):
${html.substring(0, 8000)}
${historyText}

Generate ONE command that makes progress toward completing the instruction.
If the instruction is complete, respond with "COMPLETE".`;
  }
}
