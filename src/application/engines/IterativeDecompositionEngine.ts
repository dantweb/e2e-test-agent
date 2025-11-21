import { ILLMProvider } from '../../infrastructure/llm/interfaces';
import { IHTMLExtractor } from '../interfaces/IHTMLExtractor';
import { OxtestParser } from '../../infrastructure/parsers/OxtestParser';
import { OxtestPromptBuilder } from '../../infrastructure/llm/OxtestPromptBuilder';
import { Subtask } from '../../domain/entities/Subtask';
import { OxtestCommand } from '../../domain/entities/OxtestCommand';
import { LanguageDetectionService } from '../services/LanguageDetectionService';

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
  private readonly verbose: boolean;
  private readonly languageDetector: LanguageDetectionService;

  /**
   * Creates engine for decomposing instructions into OXTest commands.
   *
   * @param llmProvider LLM provider for generating decompositions
   * @param htmlExtractor HTML extractor for page context
   * @param oxtestParser Parser for OXTest syntax
   * @param model Model name (required, validated by provider)
   * @param verbose Enable verbose logging (default: false)
   */
  constructor(
    private readonly llmProvider: ILLMProvider,
    private readonly htmlExtractor: IHTMLExtractor,
    private readonly oxtestParser: OxtestParser,
    model: string,
    verbose: boolean = false
  ) {
    this.promptBuilder = new OxtestPromptBuilder();
    this.model = model;
    this.verbose = verbose;
    this.languageDetector = new LanguageDetectionService();
  }

  /**
   * Decomposes an instruction into a subtask with commands.
   * Uses two-pass process: planning → command generation.
   *
   * @param instruction Natural language instruction
   * @returns Subtask with generated commands
   * @throws Error if decomposition fails
   */
  public async decompose(instruction: string): Promise<Subtask> {
    try {
      if (this.verbose) {
        console.log(`\n   🎯 Starting two-pass decomposition for: "${instruction}"`);
      }

      // Pass 1: Create execution plan
      const steps = await this.createPlan(instruction);

      if (this.verbose) {
        console.log(`   ✓ Planning complete: ${steps.length} step(s) identified\n`);
      }

      // Pass 2: Generate commands for each step
      const commands: OxtestCommand[] = [];
      for (let i = 0; i < steps.length; i++) {
        const step = steps[i];

        if (this.verbose) {
          console.log(`   📌 Step ${i + 1}/${steps.length}: ${step}`);
        }

        const command = await this.generateCommandForStepWithValidation(step, instruction, 3);
        commands.push(command);

        if (this.verbose) {
          console.log(
            `   ✓ Generated: ${command.type} ${command.selector ? `${command.selector.strategy}=${command.selector.value}` : ''}\n`
          );
        }
      }

      if (this.verbose) {
        console.log(`   🎉 Decomposition complete: ${commands.length} command(s) generated`);
      }

      // Handle empty commands case
      if (commands.length === 0) {
        // Return a subtask with a no-op wait command
        return new Subtask(`subtask-${Date.now()}`, instruction, [
          new OxtestCommand('wait', { timeout: 0 }),
        ]);
      }

      return new Subtask(`subtask-${Date.now()}`, instruction, commands);
    } catch (error) {
      throw new Error(`Decomposition failed: ${(error as Error).message}`);
    }
  }

  /**
   * @deprecated This method is not used in production. Use SimpleEOPEngine instead.
   *
   * Decomposes an instruction iteratively, discovering actions step-by-step.
   * After each action, re-examines the page to determine the next step.
   *
   * ⚠️ LIMITATION: This method does NOT execute commands during generation,
   * so it cannot handle dynamic content (dropdowns, modals, AJAX).
   *
   * ✅ PRODUCTION SOLUTION: Use SimpleEOPEngine which executes commands
   * during generation to keep HTML fresh and handle dynamic content.
   * See: src/application/engines/SimpleEOPEngine.ts
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

  /**
   * Creates a plan by breaking down an instruction into atomic steps.
   * This is the first pass of the iterative decomposition.
   *
   * @param instruction Natural language instruction
   * @returns Array of step descriptions
   * @internal For testing purposes, will be made private once integrated
   */
  public async createPlan(instruction: string): Promise<string[]> {
    if (this.verbose) {
      console.log(`   📋 Creating execution plan for: "${instruction}"`);
    }

    // 1. Extract HTML
    const html = await this.htmlExtractor.extractSimplified();

    if (this.verbose) {
      console.log(`   📊 HTML context: ${html.length} characters`);
    }

    // 2. Detect language
    const language = this.languageDetector.detectLanguage(html);
    const languageContext = this.languageDetector.getLanguageContext(language);

    if (this.verbose && language.code !== 'en') {
      console.log(`   🌍 Language detected: ${language.name} (${language.code})`);
    }

    // 3. Build planning prompts
    const systemPrompt = this.promptBuilder.buildPlanningSystemPrompt();
    const userPrompt = this.promptBuilder.buildPlanningPrompt(instruction, html, languageContext);

    if (this.verbose) {
      console.log(`   🤖 Requesting plan from LLM (model: ${this.model})...`);
    }

    // 3. Call LLM
    const response = await this.llmProvider.generate(userPrompt, {
      systemPrompt,
      model: this.model,
    });

    if (this.verbose) {
      console.log(`   ✅ Plan response received`);
    }

    // 4. Parse steps
    const steps = this.parsePlanSteps(response.content);

    if (this.verbose) {
      console.log(`   ✓ Plan created with ${steps.length} step(s):`);
      steps.forEach((step, idx) => {
        console.log(`      ${idx + 1}. ${step}`);
      });
    }

    // 5. Fallback if empty
    if (steps.length === 0) {
      return [instruction];
    }

    return steps;
  }

  /**
   * Parses plan steps from LLM response.
   * Handles various formats: numbered lists, bullet points, plain text.
   *
   * @param response LLM response text
   * @returns Array of step descriptions
   * @internal For testing purposes, will be made private once integrated
   */
  public parsePlanSteps(response: string): string[] {
    const lines = response.split('\n');
    const steps: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();

      // Skip empty lines and short lines
      if (!trimmed || trimmed.length < 5) continue;

      // Skip headers
      const lowerLine = trimmed.toLowerCase();
      if (lowerLine.startsWith('plan')) continue;
      if (lowerLine.startsWith('step')) continue;
      if (lowerLine === 'here is' || lowerLine === 'here are') continue;

      // Match numbered lists: "1. Step text" or "1) Step text"
      const numberedMatch = trimmed.match(/^\d+[.)]\s+(.+)$/);
      if (numberedMatch) {
        steps.push(numberedMatch[1].trim());
        continue;
      }

      // Match bullet points: "- Step text" or "* Step text"
      const bulletMatch = trimmed.match(/^[-*]\s+(.+)$/);
      if (bulletMatch) {
        steps.push(bulletMatch[1].trim());
        continue;
      }

      // If line is substantial (>10 chars) and doesn't end with colon, treat as step
      if (trimmed.length > 10 && !trimmed.endsWith(':')) {
        steps.push(trimmed);
      }
    }

    return steps;
  }

  /**
   * Generates an OXTest command for a single step.
   * This is the second pass of the iterative decomposition.
   *
   * @param step Step description from planning phase
   * @param instruction Original high-level instruction for context
   * @returns OXTest command for the step
   * @internal For testing purposes, will be made private once integrated
   */
  public async generateCommandForStep(step: string, instruction: string): Promise<OxtestCommand> {
    if (this.verbose) {
      console.log(`   🔧 Generating command for step: "${step}"`);
    }

    // 1. Extract HTML context
    const html = await this.htmlExtractor.extractSimplified();

    if (this.verbose) {
      console.log(`   📊 HTML context: ${html.length} characters`);
    }

    // 2. Detect language
    const language = this.languageDetector.detectLanguage(html);
    const languageContext = this.languageDetector.getLanguageContext(language);

    if (this.verbose && language.code !== 'en') {
      console.log(`   🌍 Language detected: ${language.name} (${language.code})`);
    }

    // 3. Build command generation prompts
    const systemPrompt = this.promptBuilder.buildSystemPrompt();
    const userPrompt = this.promptBuilder.buildCommandGenerationPrompt(
      step,
      instruction,
      html,
      languageContext
    );

    if (this.verbose) {
      console.log(`   🤖 Requesting command from LLM (model: ${this.model})...`);
    }

    // 4. Call LLM
    const response = await this.llmProvider.generate(userPrompt, {
      systemPrompt,
      model: this.model,
    });

    if (this.verbose) {
      console.log(`   ✅ Command response received: ${response.content.substring(0, 50)}...`);
    }

    // 5. Parse command
    let commands: readonly OxtestCommand[];
    try {
      commands = this.oxtestParser.parseContent(response.content);
    } catch {
      if (this.verbose) {
        console.log(`   ⚠️  Parsing failed, using fallback wait command`);
      }
      // Fallback to wait command if parsing fails
      return new OxtestCommand('wait', { timeout: 0 });
    }

    // 6. Return first command (should be only one)
    if (commands.length === 0) {
      if (this.verbose) {
        console.log(`   ⚠️  No commands generated, using fallback wait command`);
      }
      return new OxtestCommand('wait', { timeout: 0 });
    }

    const command = commands[0];

    if (this.verbose) {
      console.log(
        `   ✓ Generated command: ${command.type} ${command.selector ? `${command.selector.strategy}=${command.selector.value}` : ''}`
      );
    }

    return command;
  }

  /**
   * Validates a command against HTML to check if selectors exist.
   * Returns validation result with issues if any.
   *
   * @param command Command to validate
   * @param html Current page HTML
   * @returns Validation result
   * @internal For testing purposes, will be made private once integrated
   */
  public validateCommand(
    command: OxtestCommand,
    html: string
  ): { valid: boolean; issues: string[] } {
    const issues: string[] = [];

    // Commands without selectors are always valid
    if (!command.selector) {
      return { valid: true, issues: [] };
    }

    const { strategy, value } = command.selector;

    // Skip validation for selectors that commonly appear in dynamic content
    // These elements may not be present in HTML until previous commands execute
    const isDynamicSelector =
      (strategy === 'css' && value.includes('[type=password]')) || // Password fields often in dropdowns/modals
      (strategy === 'css' && value.includes('[type=email]')) || // Email fields often in dropdowns/modals
      (strategy === 'css' && value.includes('[type=hidden]')); // Hidden fields by definition

    if (isDynamicSelector && this.verbose) {
      console.log(`   ℹ️  Skipping validation for dynamic selector: ${value}`);
    }

    // Simple validation based on strategy
    switch (strategy) {
      case 'css':
        // Check if CSS selector appears in HTML (simple check)
        if (!isDynamicSelector && !this.selectorExistsInHTML(value, html)) {
          issues.push(`Selector ${value} not found in HTML`);
        }
        break;

      case 'text':
        // Check if text appears in HTML
        const textMatches = this.countTextMatches(value, html);
        if (textMatches === 0) {
          issues.push(`Text "${value}" not found in HTML`);
        } else if (textMatches > 1) {
          issues.push(`Text selector "${value}" matches multiple elements (${textMatches} found)`);
        }
        break;

      case 'placeholder':
        // Check if placeholder attribute exists
        if (!html.includes(`placeholder="${value}"`)) {
          issues.push(`Placeholder "${value}" not found in HTML`);
        }
        break;

      case 'xpath':
      case 'role':
      case 'testid':
        // For these strategies, we do basic existence checks
        if (!html.includes(value)) {
          issues.push(`${strategy} selector "${value}" not found in HTML`);
        }
        break;
    }

    return {
      valid: issues.length === 0,
      issues,
    };
  }

  /**
   * Helper to check if a selector-like pattern exists in HTML.
   */
  private selectorExistsInHTML(selector: string, html: string): boolean {
    // Handle class selectors (.classname)
    if (selector.startsWith('.')) {
      const className = selector.substring(1);
      // Check for exact class name match (whole class, not substring)
      // Match: class="exact-match" or class="foo exact-match bar"
      // Don't match: class="exact-match-more"
      const classPattern = new RegExp(
        `class="([^"]*\\s)?${className.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\s[^"]*)?"`
      );
      const matches = html.match(classPattern);
      if (!matches) return false;
      // Verify it's an exact match by checking it's not part of a longer class name
      const classAttr = matches[0];
      const classes = classAttr.match(/class="([^"]*)"/)?.[1]?.split(/\s+/) || [];
      return classes.includes(className);
    }

    // Handle attribute selectors ([attr="value"])
    if (selector.startsWith('[') && selector.endsWith(']')) {
      // Extract attribute and value from [attr="value"] or [attr='value']
      const attrMatch = selector.match(/\[([^=]+)=["']([^"']+)["']\]/);
      if (attrMatch) {
        const [, attrName, attrValue] = attrMatch;
        // Check if attribute with that value exists in HTML
        const attrPattern = new RegExp(
          `${attrName}=["']${attrValue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["']`
        );
        return attrPattern.test(html);
      }
    }

    // Fallback: simple substring check
    return html.includes(selector);
  }

  /**
   * Helper to count text occurrences in HTML.
   */
  private countTextMatches(text: string, html: string): number {
    const matches = html.match(new RegExp(`>${text}<`, 'g'));
    return matches ? matches.length : 0;
  }

  /**
   * Refines a command based on validation issues.
   * Calls LLM with command, issues, and HTML to generate improved command.
   *
   * @param command Original command that failed validation
   * @param issues List of validation issues
   * @param html Current page HTML
   * @returns Refined command
   * @internal For testing purposes, will be made private once integrated
   */
  public async refineCommand(
    command: OxtestCommand,
    issues: string[],
    html: string
  ): Promise<OxtestCommand> {
    if (this.verbose) {
      console.log(`   🔄 Refining command due to validation issues:`);
      issues.forEach(issue => console.log(`      - ${issue}`));
    }

    // Detect language
    const language = this.languageDetector.detectLanguage(html);
    const languageContext = this.languageDetector.getLanguageContext(language);

    if (this.verbose && language.code !== 'en') {
      console.log(`   🌍 Language context for refinement: ${language.name}`);
    }

    // Build refinement prompt
    const systemPrompt = this.promptBuilder.buildSystemPrompt();
    const userPrompt = this.promptBuilder.buildValidationRefinementPrompt(
      command,
      issues,
      html,
      languageContext
    );

    if (this.verbose) {
      console.log(`   🤖 Requesting refined command from LLM...`);
    }

    // Call LLM for refinement
    const response = await this.llmProvider.generate(userPrompt, {
      systemPrompt,
      model: this.model,
    });

    if (this.verbose) {
      console.log(`   ✅ Refinement response received`);
    }

    // Parse refined command
    try {
      const commands = this.oxtestParser.parseContent(response.content);
      if (commands.length > 0) {
        return commands[0];
      }
    } catch {
      // If parsing fails, return original command
      if (this.verbose) {
        console.log(`   ⚠️  Failed to parse refined command, keeping original`);
      }
    }

    return command;
  }

  /**
   * Generates a command for a step with validation and refinement.
   * Validates the generated command and refines it if issues are found (up to maxAttempts).
   *
   * @param step Step description
   * @param instruction Original instruction for context
   * @param maxAttempts Maximum refinement attempts (default: 3)
   * @returns Validated and potentially refined command
   * @internal For testing purposes, will be made private once integrated
   */
  public async generateCommandForStepWithValidation(
    step: string,
    instruction: string,
    maxAttempts: number = 3
  ): Promise<OxtestCommand> {
    // Generate initial command
    let command = await this.generateCommandForStep(step, instruction);
    const html = await this.htmlExtractor.extractSimplified();

    // Validation and refinement loop
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      if (this.verbose) {
        console.log(`   🔍 Validating command (attempt ${attempt}/${maxAttempts})...`);
      }

      const validation = this.validateCommand(command, html);

      if (validation.valid) {
        if (this.verbose) {
          console.log(`   ✓ Validation passed`);
        }
        return command;
      }

      if (this.verbose) {
        console.log(`   ⚠️  Validation failed: ${validation.issues.join(', ')}`);
      }

      // If we've reached max attempts, return current command
      if (attempt === maxAttempts) {
        if (this.verbose) {
          console.log(`   ⚠️  Max refinement attempts reached, using last command`);
        }
        return command;
      }

      // Refine command
      command = await this.refineCommand(command, validation.issues, html);
    }

    return command;
  }
}
