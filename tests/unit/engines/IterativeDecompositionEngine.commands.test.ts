/**
 * Tests for IterativeDecompositionEngine - Command Generation Phase
 *
 * This file tests the SECOND PASS of the iterative decomposition:
 * - Generating one command per step from the planning phase
 * - Using HTML context for accurate selector generation
 * - Handling various command types (click, type, assert, etc.)
 * - Parameter extraction from steps
 *
 * Phase 2 builds on Phase 1 (planning) by converting each step into an OXTest command.
 */

import { IterativeDecompositionEngine } from '../../../src/application/engines/IterativeDecompositionEngine';
import { ILLMProvider } from '../../../src/infrastructure/llm/interfaces';
import { IHTMLExtractor } from '../../../src/application/interfaces/IHTMLExtractor';
import { OxtestParser } from '../../../src/infrastructure/parsers/OxtestParser';
import { OxtestCommand } from '../../../src/domain/entities/OxtestCommand';

// Mock implementations for testing
class MockLLMProvider implements ILLMProvider {
  private responses: Map<string, string> = new Map();
  public capturedPrompts: string[] = [];

  setResponse(promptContains: string, response: string): void {
    this.responses.set(promptContains, response);
  }

  async generate(
    prompt: string,
    context?: any
  ): Promise<{
    content: string;
    model: string;
    usage: any;
    finishReason: 'stop' | 'length' | 'error';
  }> {
    this.capturedPrompts.push(prompt);

    // Find matching response
    for (const key of Array.from(this.responses.keys())) {
      const response = this.responses.get(key);
      if (response !== undefined && prompt.includes(key)) {
        return {
          content: response,
          model: context?.model || 'mock',
          usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
          finishReason: 'stop' as const,
        };
      }
    }

    throw new Error(
      `No mock response configured for prompt containing: ${prompt.substring(0, 100)}...`
    );
  }

  async *streamGenerate(_prompt: string, _context?: any): AsyncGenerator<string, void, unknown> {
    yield 'mock stream';
  }

  reset(): void {
    this.capturedPrompts = [];
  }
}

class MockHTMLExtractor implements IHTMLExtractor {
  private html: string = '<html><body>Mock page</body></html>';

  setHTML(html: string): void {
    this.html = html;
  }

  async extractHTML(): Promise<string> {
    return this.html;
  }

  async extractSimplified(): Promise<string> {
    return this.html;
  }

  async extractVisible(): Promise<string> {
    return this.html;
  }

  async extractInteractive(): Promise<string> {
    return this.html;
  }

  async extractSemantic(): Promise<string> {
    return this.html;
  }

  async extractTruncated(_maxLength: number): Promise<string> {
    return this.html;
  }

  getLastHTML(): string {
    return this.html;
  }
}

describe('IterativeDecompositionEngine - Command Generation Phase', () => {
  let mockLLM: MockLLMProvider;
  let mockHTML: MockHTMLExtractor;
  let parser: OxtestParser;

  beforeEach(() => {
    mockLLM = new MockLLMProvider();
    mockHTML = new MockHTMLExtractor();
    parser = new OxtestParser();
  });

  describe('generateCommandForStep() method', () => {
    it('should generate click command for click step', async () => {
      // Arrange
      mockLLM.setResponse(
        'Click the login button',
        'click text="Login" fallback=css=button.login-btn'
      );

      mockHTML.setHTML(`
        <button class="login-btn">Login</button>
      `);

      const engine = new IterativeDecompositionEngine(mockLLM, mockHTML, parser, 'gpt-4', false);

      // Act
      const command = await engine.generateCommandForStep(
        'Click the login button',
        'Login with credentials'
      );

      // Assert
      expect(command).toBeDefined();
      expect(command.type).toBe('click');
      expect(command.selector).toBeDefined();
      expect(command.selector?.strategy).toBe('text');
      expect(command.selector?.value).toBe('Login');
    });

    it('should generate type command for fill step', async () => {
      // Arrange
      mockLLM.setResponse(
        'Fill the email field',
        'type placeholder="Email" value="test@example.com"'
      );

      mockHTML.setHTML(`
        <input type="email" placeholder="Email" name="email" />
      `);

      const engine = new IterativeDecompositionEngine(mockLLM, mockHTML, parser, 'gpt-4', false);

      // Act
      const command = await engine.generateCommandForStep(
        'Fill the email field with "test@example.com"',
        'Login with credentials'
      );

      // Assert
      expect(command).toBeDefined();
      expect(command.type).toBe('type');
      expect(command.selector?.strategy).toBe('placeholder');
      expect(command.selector?.value).toBe('Email');
      expect(command.params.value).toBe('test@example.com');
    });

    it('should generate assert command for verification step', async () => {
      // Arrange
      mockLLM.setResponse(
        'STEP: Verify the success message',
        'assert_visible text="Login successful"'
      );

      mockHTML.setHTML(`
        <div class="success-message">Login successful</div>
      `);

      const engine = new IterativeDecompositionEngine(mockLLM, mockHTML, parser, 'gpt-4', false);

      // Act
      const command = await engine.generateCommandForStep(
        'Verify the success message is displayed',
        'Login with credentials'
      );

      // Assert
      expect(command).toBeDefined();
      expect(command.type).toBe('assertVisible');
      expect(command.selector?.strategy).toBe('text');
      expect(command.selector?.value).toBe('Login successful');
    });

    it('should include HTML context when generating command', async () => {
      // Arrange
      mockLLM.setResponse('Generate', 'click css=button');

      mockHTML.setHTML(`
        <button id="submit-btn" class="primary-button">Submit</button>
        <button id="cancel-btn" class="secondary-button">Cancel</button>
      `);

      const engine = new IterativeDecompositionEngine(mockLLM, mockHTML, parser, 'gpt-4', false);

      // Act
      await engine.generateCommandForStep('Click the submit button', 'Submit form');

      // Assert
      expect(mockLLM.capturedPrompts.length).toBe(1);
      const prompt = mockLLM.capturedPrompts[0];
      expect(prompt).toContain('button');
      expect(prompt).toContain('Submit'); // HTML content
    });

    it('should include original instruction as context', async () => {
      // Arrange
      mockLLM.setResponse('Generate', 'click text="Login"');

      const engine = new IterativeDecompositionEngine(mockLLM, mockHTML, parser, 'gpt-4', false);

      // Act
      await engine.generateCommandForStep('Click the login button', 'Login with admin credentials');

      // Assert
      expect(mockLLM.capturedPrompts.length).toBe(1);
      const prompt = mockLLM.capturedPrompts[0];
      expect(prompt).toContain('Login with admin credentials'); // Original instruction
      expect(prompt).toContain('Click the login button'); // Current step
    });

    it('should handle wait commands', async () => {
      // Arrange
      mockLLM.setResponse('STEP: Wait for the page', 'wait_navigation timeout=5000');

      const engine = new IterativeDecompositionEngine(mockLLM, mockHTML, parser, 'gpt-4', false);

      // Act
      const command = await engine.generateCommandForStep(
        'Wait for the page to load after clicking submit',
        'Submit registration form'
      );

      // Assert
      expect(command).toBeDefined();
      expect(command.type).toBe('wait'); // wait_navigation is normalized to 'wait'
      expect(command.params.timeout).toBe('5000'); // Parser returns string
    });

    it('should handle navigate commands', async () => {
      // Arrange
      mockLLM.setResponse('Navigate to', 'navigate url=https://example.com/login');

      const engine = new IterativeDecompositionEngine(mockLLM, mockHTML, parser, 'gpt-4', false);

      // Act
      const command = await engine.generateCommandForStep(
        'Navigate to the login page',
        'Access login page'
      );

      // Assert
      expect(command).toBeDefined();
      expect(command.type).toBe('navigate');
      expect(command.params.url).toBe('https://example.com/login');
    });

    it('should extract parameters from step description', async () => {
      // Arrange
      mockLLM.setResponse(
        'STEP: Fill the username',
        'type placeholder="Username" value="john_doe"'
      );

      mockHTML.setHTML(`
        <input name="username" placeholder="Username" />
      `);

      const engine = new IterativeDecompositionEngine(mockLLM, mockHTML, parser, 'gpt-4', false);

      // Act
      const command = await engine.generateCommandForStep(
        'Fill the username field with "john_doe"',
        'Register new user'
      );

      // Assert
      expect(command).toBeDefined();
      expect(command.params.value).toBe('john_doe');
    });

    it('should handle complex selectors with fallbacks', async () => {
      // Arrange
      mockLLM.setResponse(
        'STEP: Click the submit',
        'click text="Submit" fallback=css=button[type="submit"] fallback=role=button'
      );

      const engine = new IterativeDecompositionEngine(mockLLM, mockHTML, parser, 'gpt-4', false);

      // Act
      const command = await engine.generateCommandForStep('Click the submit button', 'Submit form');

      // Assert
      expect(command).toBeDefined();
      expect(command.type).toBe('click');
      expect(command.selector?.strategy).toBe('text');
      expect(command.selector?.fallbacks).toBeDefined();
      expect(command.selector?.fallbacks.length).toBeGreaterThanOrEqual(1);
    });

    it('should handle empty or invalid LLM response gracefully', async () => {
      // Arrange
      mockLLM.setResponse('Generate', '');

      const engine = new IterativeDecompositionEngine(mockLLM, mockHTML, parser, 'gpt-4', false);

      // Act
      const command = await engine.generateCommandForStep('Click something', 'Do something');

      // Assert
      // Should return a wait command as fallback
      expect(command).toBeDefined();
      expect(command.type).toBe('wait');
    });
  });

  describe('Verbose logging for command generation', () => {
    it('should log command generation when verbose is true', async () => {
      // Arrange
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      mockLLM.setResponse('Generate', 'click text="Button"');

      const engine = new IterativeDecompositionEngine(
        mockLLM,
        mockHTML,
        parser,
        'gpt-4',
        true // verbose = true
      );

      // Act
      await engine.generateCommandForStep('Click the button', 'Test instruction');

      // Assert
      expect(consoleSpy).toHaveBeenCalled();
      const logs = consoleSpy.mock.calls.map(call => call.join(' '));
      expect(
        logs.some((log: string) => log.includes('Generating') || log.includes('command'))
      ).toBe(true);

      consoleSpy.mockRestore();
    });

    it('should not log when verbose is false', async () => {
      // Arrange
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      mockLLM.setResponse('Generate', 'click text="Button"');

      const engine = new IterativeDecompositionEngine(
        mockLLM,
        mockHTML,
        parser,
        'gpt-4',
        false // verbose = false
      );

      // Act
      await engine.generateCommandForStep('Click the button', 'Test instruction');

      // Assert
      expect(consoleSpy).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe('Integration with planning phase', () => {
    it('should generate commands for each step in a plan', async () => {
      // Arrange
      // Planning phase response
      mockLLM.setResponse(
        'Break down',
        `1. Click login button
2. Fill username field
3. Fill password field
4. Click submit button`
      );

      // Command generation responses - use unique parts of each step for matching
      mockLLM.setResponse('STEP: Click login button', 'click text="Login"');
      mockLLM.setResponse('STEP: Fill username field', 'type css=[name="username"] value="admin"');
      mockLLM.setResponse('STEP: Fill password field', 'type css=[name="password"] value="secret"');
      mockLLM.setResponse('STEP: Click submit button', 'click css=button[type="submit"]');

      mockHTML.setHTML(`
        <button class="login-btn">Login</button>
        <form>
          <input name="username" type="text" />
          <input name="password" type="password" />
          <button type="submit">Submit</button>
        </form>
      `);

      const engine = new IterativeDecompositionEngine(mockLLM, mockHTML, parser, 'gpt-4', false);

      // Act
      const plan = await engine.createPlan('Login with admin and secret');
      const commands: OxtestCommand[] = [];

      for (const step of plan) {
        const command = await engine.generateCommandForStep(step, 'Login with admin and secret');
        commands.push(command);
      }

      // Assert
      expect(commands).toBeDefined();
      expect(commands.length).toBe(4);
      expect(commands[0].type).toBe('click');
      expect(commands[1].type).toBe('type');
      expect(commands[2].type).toBe('type');
      expect(commands[3].type).toBe('click');
    });
  });
});
