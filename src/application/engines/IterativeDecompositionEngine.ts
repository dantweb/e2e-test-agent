import { ILLMProvider } from '../../infrastructure/llm/interfaces';
import { IHTMLExtractor } from '../interfaces/IHTMLExtractor';
import { OxtestParser } from '../../infrastructure/parsers/OxtestParser';
import { OxtestPromptBuilder } from '../../infrastructure/llm/OxtestPromptBuilder';
import { Subtask } from '../../domain/entities/Subtask';
import { OxtestCommand } from '../../domain/entities/OxtestCommand';

/**
 * Iteratively decomposes high-level instructions into Oxtest commands.
 * Uses LLM to discover actions step-by-step based on current page state.
 *
 * Uses IHTMLExtractor interface for HTML extraction, enabling:
 * - Testing with mock extractors
 * - Swapping between different browser automation tools
 * - Custom extraction strategies without modifying this class
 */
export class IterativeDecompositionEngine {
  private readonly promptBuilder: OxtestPromptBuilder;
  private readonly model: string;

  /**
   * Creates engine for decomposing instructions into OXTest commands.
   *
   * @param llmProvider LLM provider for generating decompositions
   * @param htmlExtractor HTML extractor for page context
   * @param oxtestParser Parser for OXTest syntax
   * @param model Model name (required, validated by provider)
   */
  constructor(
    private readonly llmProvider: ILLMProvider,
    private readonly htmlExtractor: IHTMLExtractor,
    private readonly oxtestParser: OxtestParser,
    model: string
  ) {
    this.promptBuilder = new OxtestPromptBuilder();
    this.model = model;
  }

  /**
   * Decomposes an instruction into a subtask with commands.
   * Single-step decomposition without iteration.
   *
   * @param instruction Natural language instruction
   * @returns Subtask with generated commands
   * @throws Error if decomposition fails
   */
  public async decompose(instruction: string): Promise<Subtask> {
    try {
      const html = await this.htmlExtractor.extractSimplified();

      const systemPrompt = this.promptBuilder.buildSystemPrompt();
      const userPrompt = this.promptBuilder.buildDiscoveryPrompt(instruction, html);

      const response = await this.llmProvider.generate(userPrompt, {
        systemPrompt,
        model: this.model,
      });

      const commands = this.oxtestParser.parseContent(response.content);

      // Handle empty commands case
      if (commands.length === 0) {
        // Return a subtask with a no-op wait command
        return new Subtask(`subtask-${Date.now()}`, instruction, [
          new OxtestCommand('wait', { timeout: 0 }),
        ]);
      }

      return new Subtask(`subtask-${Date.now()}`, instruction, Array.from(commands));
    } catch (error) {
      throw new Error(`Decomposition failed: ${(error as Error).message}`);
    }
  }

  /**
   * Decomposes an instruction iteratively, discovering actions step-by-step.
   * After each action, re-examines the page to determine the next step.
   *
   * @param instruction Natural language instruction
   * @param maxIterations Maximum number of iterations (default: 10)
   * @returns Subtask with all generated commands
   */
  public async decomposeIteratively(instruction: string, maxIterations = 10): Promise<Subtask> {
    const commands: OxtestCommand[] = [];
    const conversationHistory: Array<{
      role: 'user' | 'assistant';
      content: string;
    }> = [];

    const systemPrompt = this.promptBuilder.buildSystemPrompt();

    for (let i = 0; i < maxIterations; i++) {
      try {
        const html = await this.htmlExtractor.extractSimplified();

        const prompt =
          conversationHistory.length === 0
            ? this.promptBuilder.buildDiscoveryPrompt(instruction, html)
            : this.promptBuilder.buildRefinementPrompt(instruction, html, conversationHistory);

        conversationHistory.push({ role: 'user', content: prompt });

        const response = await this.llmProvider.generate(prompt, {
          systemPrompt,
          conversationHistory: conversationHistory.slice(0, -1), // Exclude current prompt
          model: this.model,
        });

        conversationHistory.push({ role: 'assistant', content: response.content });

        // Check for completion
        if (this.isComplete(response.content)) {
          break;
        }

        // Parse and add commands
        try {
          const newCommands = this.oxtestParser.parseContent(response.content);
          commands.push(...newCommands);
        } catch (parseError) {
          // If parsing fails, it might be a completion message
          if (this.isComplete(response.content)) {
            break;
          }
          // Otherwise, it's a real error
          throw parseError;
        }

        // Check if we should stop
        if (this.shouldStop(response.content, commands.length)) {
          break;
        }
      } catch (error) {
        // On error, stop iteration but return what we have so far
        console.error(`Iteration ${i} failed:`, error);
        break;
      }
    }

    // Handle empty commands case
    if (commands.length === 0) {
      // Return a subtask with a no-op wait command
      return new Subtask(`subtask-${Date.now()}`, instruction, [
        new OxtestCommand('wait', { timeout: 0 }),
      ]);
    }

    return new Subtask(`subtask-${Date.now()}`, instruction, commands);
  }

  /**
   * Checks if the LLM indicates task completion.
   */
  private isComplete(content: string): boolean {
    const normalized = content.toLowerCase().trim();
    return (
      normalized === 'complete' || normalized === 'done' || normalized.startsWith('# complete')
    );
  }

  /**
   * Determines if iteration should stop.
   */
  private shouldStop(content: string, commandCount: number): boolean {
    // Stop if no commands generated and LLM indicates inability
    if (commandCount === 0 && content.toLowerCase().includes('cannot')) {
      return true;
    }

    // Stop if LLM indicates completion
    if (this.isComplete(content)) {
      return true;
    }

    return false;
  }
}
