/**
 * Tests for IterativeDecompositionEngine - Validation & Refinement Phase
 *
 * This file tests the THIRD PASS of the iterative decomposition:
 * - Validating generated commands against HTML
 * - Detecting issues (missing elements, ambiguous selectors, etc.)
 * - Refining commands that fail validation
 * - Limiting refinement attempts (max 3)
 *
 * Phase 3 builds on Phase 2 (command generation) by ensuring commands are valid and refined.
 */

import { IterativeDecompositionEngine } from '../../../src/application/engines/IterativeDecompositionEngine';
import { ILLMProvider } from '../../../src/infrastructure/llm/interfaces';
import { IHTMLExtractor } from '../../../src/application/interfaces/IHTMLExtractor';
import { OxtestParser } from '../../../src/infrastructure/parsers/OxtestParser';
import { OxtestCommand } from '../../../src/domain/entities/OxtestCommand';
import { SelectorSpec } from '../../../src/domain/entities/SelectorSpec';

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

describe('IterativeDecompositionEngine - Validation & Refinement Phase', () => {
  let mockLLM: MockLLMProvider;
  let mockHTML: MockHTMLExtractor;
  let parser: OxtestParser;

  beforeEach(() => {
    mockLLM = new MockLLMProvider();
    mockHTML = new MockHTMLExtractor();
    parser = new OxtestParser();
  });

  describe('validateCommand() method', () => {
    it('should validate command with selector that exists in HTML', () => {
      // Arrange
      mockHTML.setHTML(`
        <button class="submit-btn">Submit</button>
      `);

      const engine = new IterativeDecompositionEngine(mockLLM, mockHTML, parser, 'gpt-4', false);
      const command = new OxtestCommand('click', {}, new SelectorSpec('css', '.submit-btn'));

      // Act
      const result = engine.validateCommand(command, mockHTML.getLastHTML());

      // Assert
      expect(result.valid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('should detect missing element in HTML', () => {
      // Arrange
      mockHTML.setHTML(`
        <button class="cancel-btn">Cancel</button>
      `);

      const engine = new IterativeDecompositionEngine(mockLLM, mockHTML, parser, 'gpt-4', false);
      const command = new OxtestCommand('click', {}, new SelectorSpec('css', '.submit-btn'));

      // Act
      const result = engine.validateCommand(command, mockHTML.getLastHTML());

      // Assert
      expect(result.valid).toBe(false);
      expect(result.issues).toContain('Selector .submit-btn not found in HTML');
    });

    it('should detect ambiguous text selector (multiple matches)', () => {
      // Arrange
      mockHTML.setHTML(`
        <button>Submit</button>
        <a href="#">Submit</a>
      `);

      const engine = new IterativeDecompositionEngine(mockLLM, mockHTML, parser, 'gpt-4', false);
      const command = new OxtestCommand('click', {}, new SelectorSpec('text', 'Submit'));

      // Act
      const result = engine.validateCommand(command, mockHTML.getLastHTML());

      // Assert
      expect(result.valid).toBe(false);
      expect(result.issues).toContain('Text selector "Submit" matches multiple elements (2 found)');
    });

    it('should validate commands without selectors (navigate, wait)', () => {
      // Arrange
      const engine = new IterativeDecompositionEngine(mockLLM, mockHTML, parser, 'gpt-4', false);
      const command = new OxtestCommand('navigate', { url: 'https://example.com' });

      // Act
      const result = engine.validateCommand(command, '<html></html>');

      // Assert
      expect(result.valid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('should validate type command with placeholder selector', () => {
      // Arrange
      mockHTML.setHTML(`
        <input type="email" placeholder="Enter email" />
      `);

      const engine = new IterativeDecompositionEngine(mockLLM, mockHTML, parser, 'gpt-4', false);
      const command = new OxtestCommand(
        'type',
        { value: 'test@example.com' },
        new SelectorSpec('placeholder', 'Enter email')
      );

      // Act
      const result = engine.validateCommand(command, mockHTML.getLastHTML());

      // Assert
      expect(result.valid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('should detect missing placeholder in HTML', () => {
      // Arrange
      mockHTML.setHTML(`
        <input type="email" placeholder="Email address" />
      `);

      const engine = new IterativeDecompositionEngine(mockLLM, mockHTML, parser, 'gpt-4', false);
      const command = new OxtestCommand(
        'type',
        { value: 'test@example.com' },
        new SelectorSpec('placeholder', 'Enter email')
      );

      // Act
      const result = engine.validateCommand(command, mockHTML.getLastHTML());

      // Assert
      expect(result.valid).toBe(false);
      expect(result.issues.length).toBeGreaterThan(0);
    });
  });

  describe('refineCommand() method', () => {
    it('should call LLM with validation issues to refine command', async () => {
      // Arrange
      mockHTML.setHTML(`
        <button class="submit-button">Submit Form</button>
      `);

      mockLLM.setResponse('REFINE', 'click css=.submit-button');

      const engine = new IterativeDecompositionEngine(mockLLM, mockHTML, parser, 'gpt-4', false);
      const command = new OxtestCommand('click', {}, new SelectorSpec('css', '.submit-btn'));
      const issues = ['Selector .submit-btn not found in HTML'];

      // Act
      const refined = await engine.refineCommand(command, issues, mockHTML.getLastHTML());

      // Assert
      expect(refined).toBeDefined();
      expect(refined.type).toBe('click');
      expect(refined.selector?.value).toBe('.submit-button');
      expect(mockLLM.capturedPrompts.length).toBe(1);
      expect(mockLLM.capturedPrompts[0]).toContain('REFINE');
    });

    it('should include original command in refinement prompt', async () => {
      // Arrange
      mockHTML.setHTML('<button>Submit</button>');
      mockLLM.setResponse('REFINE', 'click text="Submit"');

      const engine = new IterativeDecompositionEngine(mockLLM, mockHTML, parser, 'gpt-4', false);
      const command = new OxtestCommand('click', {}, new SelectorSpec('css', '.missing'));

      // Act
      await engine.refineCommand(command, ['Selector not found'], mockHTML.getLastHTML());

      // Assert
      const prompt = mockLLM.capturedPrompts[0];
      expect(prompt).toContain('click');
      expect(prompt).toContain('.missing');
    });

    it('should include validation issues in refinement prompt', async () => {
      // Arrange
      mockHTML.setHTML('<button>Submit</button>');
      mockLLM.setResponse('REFINE', 'click text="Submit"');

      const engine = new IterativeDecompositionEngine(mockLLM, mockHTML, parser, 'gpt-4', false);
      const command = new OxtestCommand('click', {}, new SelectorSpec('css', '.missing'));
      const issues = ['Selector .missing not found in HTML', 'Try using text selector'];

      // Act
      await engine.refineCommand(command, issues, mockHTML.getLastHTML());

      // Assert
      const prompt = mockLLM.capturedPrompts[0];
      expect(prompt).toContain('Selector .missing not found');
      expect(prompt).toContain('Try using text selector');
    });

    it('should include HTML in refinement prompt', async () => {
      // Arrange
      mockHTML.setHTML('<button class="primary">Submit</button>');
      mockLLM.setResponse('REFINE', 'click css=.primary');

      const engine = new IterativeDecompositionEngine(mockLLM, mockHTML, parser, 'gpt-4', false);
      const command = new OxtestCommand('click', {}, new SelectorSpec('css', '.missing'));

      // Act
      await engine.refineCommand(command, ['Not found'], mockHTML.getLastHTML());

      // Assert
      const prompt = mockLLM.capturedPrompts[0];
      expect(prompt).toContain('button');
      expect(prompt).toContain('primary');
    });
  });

  describe('generateCommandForStepWithValidation() method', () => {
    it('should return command immediately if validation passes', async () => {
      // Arrange
      mockHTML.setHTML('<button class="submit">Submit</button>');

      // Planning not needed for this test - just command generation
      mockLLM.setResponse('STEP:', 'click css=.submit');

      const engine = new IterativeDecompositionEngine(mockLLM, mockHTML, parser, 'gpt-4', false);

      // Act
      const command = await engine.generateCommandForStepWithValidation(
        'Click submit button',
        'Submit form',
        3
      );

      // Assert
      expect(command).toBeDefined();
      expect(command.type).toBe('click');
      expect(mockLLM.capturedPrompts.length).toBe(1); // Only initial generation
    });

    it('should refine command if initial validation fails', async () => {
      // Arrange
      mockHTML.setHTML('<button class="submit-button">Submit</button>');

      // Initial command generation - wrong selector
      mockLLM.setResponse('STEP: Click', 'click css=.submit');

      // Refinement - correct selector
      mockLLM.setResponse('REFINE', 'click css=.submit-button');

      const engine = new IterativeDecompositionEngine(mockLLM, mockHTML, parser, 'gpt-4', false);

      // Act
      const command = await engine.generateCommandForStepWithValidation(
        'Click submit button',
        'Submit form',
        3
      );

      // Assert
      expect(command).toBeDefined();
      expect(command.selector?.value).toBe('.submit-button');
      expect(mockLLM.capturedPrompts.length).toBe(2); // Generation + refinement
    });

    it('should limit refinement attempts to max specified', async () => {
      // Arrange
      mockHTML.setHTML('<button>Submit</button>');

      // All attempts return invalid selectors
      mockLLM.setResponse('STEP:', 'click css=.missing1');
      mockLLM.setResponse('REFINE', 'click css=.missing2');

      const engine = new IterativeDecompositionEngine(mockLLM, mockHTML, parser, 'gpt-4', false);

      // Act
      const command = await engine.generateCommandForStepWithValidation(
        'Click submit button',
        'Submit form',
        2 // max 2 attempts
      );

      // Assert
      expect(command).toBeDefined();
      expect(mockLLM.capturedPrompts.length).toBeLessThanOrEqual(2);
    });

    it('should return best attempt after max refinements', async () => {
      // Arrange
      mockHTML.setHTML('<button>Submit</button>');

      // All attempts fail validation
      mockLLM.setResponse('STEP:', 'click css=.missing1');
      mockLLM.setResponse('REFINE', 'click css=.missing2');

      const engine = new IterativeDecompositionEngine(mockLLM, mockHTML, parser, 'gpt-4', false);

      // Act
      const command = await engine.generateCommandForStepWithValidation(
        'Click submit button',
        'Submit form',
        2
      );

      // Assert
      expect(command).toBeDefined();
      expect(command.type).toBe('click');
      // Returns last attempt even if invalid
    });
  });

  describe('Verbose logging for validation', () => {
    it('should log validation results when verbose is true', async () => {
      // Arrange
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      mockHTML.setHTML('<button class="submit">Submit</button>');
      mockLLM.setResponse('STEP:', 'click css=.submit');

      const engine = new IterativeDecompositionEngine(
        mockLLM,
        mockHTML,
        parser,
        'gpt-4',
        true // verbose
      );

      // Act
      await engine.generateCommandForStepWithValidation('Click button', 'Test', 3);

      // Assert
      expect(consoleSpy).toHaveBeenCalled();
      const logs = consoleSpy.mock.calls.map(call => call.join(' '));
      expect(logs.some((log: string) => log.includes('Validat') || log.includes('valid'))).toBe(
        true
      );

      consoleSpy.mockRestore();
    });

    it('should log refinement attempts when verbose is true', async () => {
      // Arrange
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      mockHTML.setHTML('<button class="submit-button">Submit</button>');
      mockLLM.setResponse('STEP:', 'click css=.submit');
      mockLLM.setResponse('REFINE', 'click css=.submit-button');

      const engine = new IterativeDecompositionEngine(
        mockLLM,
        mockHTML,
        parser,
        'gpt-4',
        true // verbose
      );

      // Act
      await engine.generateCommandForStepWithValidation('Click button', 'Test', 3);

      // Assert
      expect(consoleSpy).toHaveBeenCalled();
      const logs = consoleSpy.mock.calls.map(call => call.join(' '));
      expect(logs.some((log: string) => log.includes('Refin') || log.includes('attempt'))).toBe(
        true
      );

      consoleSpy.mockRestore();
    });
  });
});
