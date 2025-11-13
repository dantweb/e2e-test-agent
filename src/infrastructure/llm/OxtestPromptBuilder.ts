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
   * Truncates HTML to fit within token limits.
   */
  private truncateHTML(html: string, maxLength: number): string {
    if (html.length <= maxLength) {
      return html;
    }

    return html.substring(0, maxLength) + '\n\n<!-- [HTML truncated for brevity] -->';
  }
}
