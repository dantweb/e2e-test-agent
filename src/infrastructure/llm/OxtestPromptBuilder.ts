/**
 * Builds prompts for LLM to generate Oxtest commands.
 * Provides context about the current page state and instructions.
 */
export class OxtestPromptBuilder {
  /**
   * Builds the system prompt that explains the Oxtest language.
   */
  public buildSystemPrompt(): string {
    return `You are an expert E2E test automation assistant. Your task is to generate Oxtest commands based on user instructions and HTML context.

Oxtest Language Syntax:
- navigate url=<URL>
- click <selector>
- type <selector> value=<text>
- hover <selector>
- keypress key=<key>
- wait timeout=<ms>
- wait_navigation timeout=<ms>
- wait_for <selector> timeout=<ms>
- assert_exists <selector>
- assert_not_exists <selector>
- assert_visible <selector>
- assert_text <selector> value=<expected>
- assert_value <selector> value=<expected>
- assert_url pattern=<regex>

Selector Strategies:
- css=<selector> (e.g., css=button.submit)
- xpath=<xpath> (e.g., xpath=//button[@type='submit'])
- text="<text>" (e.g., text="Login")
- placeholder="<text>" (e.g., placeholder="Enter email")
- label="<text>" (e.g., label="Email")
- role=<role> (e.g., role=button)
- testid=<id> (e.g., testid=submit-btn)

Fallback Selectors:
- click text="Login" fallback=css=button[type="submit"]

Rules:
1. Generate ONE command per response
2. Use the most reliable selector strategy based on HTML
3. Prefer semantic selectors (text, role, testid) over CSS
4. Include fallback selectors for important actions
5. When task is complete, respond with "COMPLETE"
6. Only generate commands for the current step, not future steps

Response Format:
Return ONLY the Oxtest command, nothing else. No explanations, no markdown, no code blocks.

Example:
User: Click the login button
You: click text="Login" fallback=css=button[type="submit"]`;
  }

  /**
   * Builds a prompt for initial discovery of the next action.
   * @param instruction User instruction for what to do
   * @param html Current page HTML
   */
  public buildDiscoveryPrompt(instruction: string, html: string): string {
    return `Task: ${instruction}

Current Page HTML:
${this.truncateHTML(html, 4000)}

Generate the FIRST Oxtest command to begin this task. Return only the command, nothing else.`;
  }

  /**
   * Builds a prompt for refinement with conversation history.
   * @param instruction Original instruction
   * @param html Current page HTML
   * @param history Conversation history
   */
  public buildRefinementPrompt(
    instruction: string,
    html: string,
    history: Array<{ role: 'user' | 'assistant'; content: string }>
  ): string {
    const previousCommands = history
      .filter(h => h.role === 'assistant' && !h.content.includes('COMPLETE'))
      .map(h => h.content)
      .join('\n');

    return `Task: ${instruction}

Previous commands executed:
${previousCommands || '(none)'}

Current Page HTML:
${this.truncateHTML(html, 4000)}

Generate the NEXT Oxtest command to continue this task. If the task is complete, respond with "COMPLETE". Return only the command or "COMPLETE", nothing else.`;
  }

  /**
   * Builds a prompt for validation generation.
   * @param instruction What to validate
   * @param html Current page HTML
   */
  public buildValidationPrompt(instruction: string, html: string): string {
    return `Task: Generate validation commands to verify: ${instruction}

Current Page HTML:
${this.truncateHTML(html, 4000)}

Generate Oxtest assertion commands to validate this condition. You can use:
- assert_exists <selector>
- assert_visible <selector>
- assert_text <selector> value=<expected>
- assert_url pattern=<regex>

Return only the assertion commands, one per line.`;
  }

  /**
   * Builds a prompt for selector generation.
   * @param description Element description
   * @param html Current page HTML
   */
  public buildSelectorPrompt(description: string, html: string): string {
    return `Find a selector for: ${description}

Current Page HTML:
${this.truncateHTML(html, 4000)}

Generate the best selector with fallback. Format:
<strategy>=<value> fallback=<strategy>=<value>

Example: text="Submit" fallback=css=button[type="submit"]

Return only the selector, nothing else.`;
  }

  /**
   * Builds a system prompt for planning phase.
   * Instructs LLM to break down instructions into atomic steps.
   */
  public buildPlanningSystemPrompt(): string {
    return `You are an expert test automation planner. Your job is to break down high-level test instructions into atomic, sequential steps.

GUIDELINES:
- Each step should be a single, clear action or verification
- Steps should be in logical order
- Be specific about what to click, fill, or verify
- Include wait steps where page transitions occur
- Include verification steps to confirm success
- Keep steps focused and atomic - one action per step

OUTPUT FORMAT:
Return a numbered list of steps, one per line:
1. First step description
2. Second step description
3. Third step description

Do not include code, selectors, or technical details - just describe what needs to happen.
Do not add explanations or commentary - only the numbered list.`;
  }

  /**
   * Builds a user prompt for planning phase.
   * Provides instruction and HTML context for creating execution plan.
   *
   * @param instruction User instruction
   * @param html Current page HTML
   */
  public buildPlanningPrompt(instruction: string, html: string): string {
    return `Break down this test instruction into atomic steps:

INSTRUCTION: ${instruction}

CURRENT PAGE HTML:
${this.truncateHTML(html, 4000)}

Analyze the HTML and the instruction. Create a step-by-step plan that accomplishes the instruction.

Return ONLY a numbered list of steps (1., 2., 3., etc.), nothing else.`;
  }

  /**
   * Builds a prompt for generating a command for a specific step.
   * Uses the original instruction for context and current HTML for selector generation.
   *
   * @param step Current step to generate command for
   * @param instruction Original high-level instruction
   * @param html Current page HTML
   */
  public buildCommandGenerationPrompt(step: string, instruction: string, html: string): string {
    return `Generate ONE Oxtest command for this specific step:

STEP: ${step}

ORIGINAL INSTRUCTION: ${instruction}

CURRENT PAGE HTML:
${this.truncateHTML(html, 4000)}

Analyze the HTML and generate the single most appropriate Oxtest command for this step.
Use semantic selectors (text, role, testid) when possible.
Include fallback selectors for important actions.

Return ONLY the Oxtest command, nothing else. No explanations, no markdown, no code blocks.`;
  }

  /**
   * Builds a prompt for refining a command based on validation issues.
   * Used when a generated command fails validation and needs improvement.
   *
   * @param command Original command that failed validation
   * @param issues List of validation issues
   * @param html Current page HTML
   */
  public buildValidationRefinementPrompt(command: any, issues: string[], html: string): string {
    // Format the original command
    let commandStr = command.type;
    if (command.selector) {
      commandStr += ` ${command.selector.strategy}="${command.selector.value}"`;
    }
    if (command.params && Object.keys(command.params).length > 0) {
      Object.entries(command.params).forEach(([key, val]) => {
        commandStr += ` ${key}="${val}"`;
      });
    }

    return `REFINE the following OXTest command that failed validation:

ORIGINAL COMMAND: ${commandStr}

VALIDATION ISSUES:
${issues.map(issue => `- ${issue}`).join('\n')}

CURRENT PAGE HTML:
${this.truncateHTML(html, 4000)}

Analyze the validation issues and HTML, then generate a CORRECTED OXTest command that addresses all issues.
Use the most reliable selector that exists in the HTML.

Return ONLY the corrected Oxtest command, nothing else. No explanations, no markdown, no code blocks.`;
  }

  /**
   * Truncates HTML to fit within token limits.
   */
  private truncateHTML(html: string, maxLength: number): string {
    if (html.length <= maxLength) {
      return html;
    }

    return html.substring(0, maxLength) + '\n\n<!-- [HTML truncated for brevity] -->';
  }
}
