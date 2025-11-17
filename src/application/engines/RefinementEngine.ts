import { ILLMProvider } from '../../infrastructure/llm/interfaces';
import { FailureContext } from '../analyzers/FailureAnalyzer';

/**
 * Regular expression for matching markdown code fences
 */
const CODE_FENCE_REGEX = /^```[a-z]*\n?|\n?```$/g;

/**
 * RefinementEngine - LLM-Powered Test Improvement
 *
 * Part of Sprint 20: Self-Healing Tests
 *
 * Takes failure context and uses LLM to generate improved test code
 */
export class RefinementEngine {
  constructor(private readonly llmProvider: ILLMProvider) {}

  /**
   * Refines a failed test using LLM-powered analysis
   *
   * @param testName Name of the test being refined
   * @param failureContext Context about the failure
   * @param previousAttempts History of previous refinement attempts
   * @returns Improved OXTest content
   */
  async refine(
    testName: string,
    failureContext: FailureContext,
    previousAttempts: FailureContext[] = []
  ): Promise<string> {
    try {
      const prompt = this.buildRefinementPrompt(testName, failureContext, previousAttempts);
      const systemPrompt = this.buildSystemPrompt();

      const response = await this.llmProvider.generate(prompt, { systemPrompt });

      // Strip markdown code fences from LLM response
      return this.stripCodeFences(response.content);
    } catch (error) {
      throw new Error(`Refinement failed: ${(error as Error).message}`);
    }
  }

  /**
   * Builds the refinement prompt with failure context and guidance
   *
   * @param testName Name of the test
   * @param failureContext Context about the failure
   * @param previousAttempts History of previous attempts
   * @returns Formatted prompt for LLM
   */
  buildRefinementPrompt(
    testName: string,
    failureContext: FailureContext,
    previousAttempts: FailureContext[] = []
  ): string {
    const prompt = `# Test Refinement Request

## Test Name
${testName}

## Execution Failure
**Error**: ${failureContext.error}
**Failed Command**: ${failureContext.failedCommand.type} at step ${failureContext.commandIndex}
**Failure Category**: ${failureContext.failureCategory}
**Page URL**: ${failureContext.pageURL}

## Page Analysis
The following selectors are available on the page:
${failureContext.availableSelectors?.join('\n') || 'No selectors captured'}
${this.formatAttemptHistory(previousAttempts)}

## Task
Generate an improved OXTest file that fixes the failure.

**Guidelines**:
1. Use selectors that actually exist on the page (see available selectors above)
2. Add fallback selectors for reliability
3. Consider adding wait commands if timing might be an issue
4. For SELECTOR_NOT_FOUND errors, try alternative selector strategies
5. For TIMEOUT errors, increase timeout or add explicit waits

Output ONLY the OXTest commands, no explanation or markdown.
`;

    return prompt;
  }

  /**
   * Strips markdown code fences from LLM-generated content
   *
   * @param content The content to clean
   * @returns Content without code fences
   */
  private stripCodeFences(content: string): string {
    return content.replace(CODE_FENCE_REGEX, '').trim();
  }

  /**
   * Formats previous attempt history for the prompt
   *
   * @param attempts Array of previous failure contexts
   * @returns Formatted attempt history string
   */
  private formatAttemptHistory(attempts: FailureContext[]): string {
    if (attempts.length === 0) {
      return '';
    }

    let history = '\n## Previous Attempts (All Failed)\n';
    attempts.forEach((attempt, index) => {
      history += `
### Attempt ${index + 1}
- Error: ${attempt.error}
- Failed command: ${attempt.failedCommand.type}
- Category: ${attempt.failureCategory}
`;
    });

    return history;
  }

  /**
   * Builds the system prompt that defines the LLM's role and capabilities
   *
   * @returns System prompt for LLM
   */
  private buildSystemPrompt(): string {
    return `You are an expert test automation engineer specializing in fixing failed tests.

Your role is to analyze test failures and generate improved OXTest commands that will pass.

OXTest Command Format:
- navigate url=<url>
- click css=<selector> fallback=text="<text>"
- fill css=<selector> value=<value>
- wait timeout=<ms>
- assert_visible css=<selector>
- assert_text css=<selector> text=<expected>

Key principles:
- Always use specific, reliable selectors
- Prefer data-testid > id > semantic selectors > class names
- Use fallback selectors for robustness
- Add waits when elements might not be immediately available
- Keep tests simple and focused

Generate valid OXTest commands only.`;
  }
}
