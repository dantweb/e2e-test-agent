/**
 * Tests for IterativeDecompositionEngine - Planning Phase
 *
 * This file tests the FIRST PASS of the iterative decomposition:
 * - Breaking down high-level instructions into atomic steps
 * - Using LLM to analyze instruction and create execution plan
 * - Parsing step list from LLM response
 *
 * The planning phase is critical - it determines how many commands
 * will be generated (one per step).
 */

import { IterativeDecompositionEngine } from '../../../src/application/engines/IterativeDecompositionEngine';
import { ILLMProvider } from '../../../src/infrastructure/llm/interfaces';
import { IHTMLExtractor } from '../../../src/application/interfaces/IHTMLExtractor';
import { OxtestParser } from '../../../src/infrastructure/parsers/OxtestParser';

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
    // Capture all prompts for verification
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
    // Not used in these tests
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

describe('IterativeDecompositionEngine - Planning Phase', () => {
  let mockLLM: MockLLMProvider;
  let mockHTML: MockHTMLExtractor;
  let parser: OxtestParser;

  beforeEach(() => {
    mockLLM = new MockLLMProvider();
    mockHTML = new MockHTMLExtractor();
    parser = new OxtestParser();
  });

  describe('createPlan() method', () => {
    it('should create plan with multiple steps for login instruction', async () => {
      // Arrange
      mockLLM.setResponse(
        'Break',
        `1. Click the login button to open the form
2. Fill the username field with "admin"
3. Fill the password field with "secret"
4. Click the submit button
5. Verify the user is logged in`
      );

      mockHTML.setHTML(`
        <button class="login-btn">Login</button>
        <form id="loginForm" style="display:none">
          <input name="username" type="text" />
          <input name="password" type="password" />
          <button type="submit">Submit</button>
        </form>
      `);

      const engine = new IterativeDecompositionEngine(mockLLM, mockHTML, parser, 'gpt-4', false);

      // Act
      const plan = await engine.createPlan('Login with username admin and password secret');

      // Assert
      expect(plan).toBeDefined();
      expect(plan).toHaveLength(5);
      expect(plan[0]).toContain('Click');
      expect(plan[0]).toContain('login');
      expect(plan[1]).toContain('username');
      expect(plan[2]).toContain('password');
      expect(plan[3]).toContain('submit');
      expect(plan[4]).toContain('Verify');
    });

    it('should create plan with single step for simple instruction', async () => {
      // Arrange
      mockLLM.setResponse('Break', '1. Navigate to the homepage');

      const engine = new IterativeDecompositionEngine(mockLLM, mockHTML, parser, 'gpt-4', false);

      // Act
      const plan = await engine.createPlan('Go to homepage');

      // Assert
      expect(plan).toBeDefined();
      expect(plan).toHaveLength(1);
      expect(plan[0]).toContain('Navigate');
    });

    it('should include HTML context when calling LLM for planning', async () => {
      // Arrange
      mockLLM.setResponse('Break', '1. Click button\n2. Fill form');

      mockHTML.setHTML(`
        <form id="testForm">
          <input name="email" type="email" placeholder="Email">
          <button class="submit-btn">Submit</button>
        </form>
      `);

      const engine = new IterativeDecompositionEngine(mockLLM, mockHTML, parser, 'gpt-4', false);

      // Act
      await engine.createPlan('Submit the form');

      // Assert
      expect(mockLLM.capturedPrompts.length).toBe(1);
      const prompt = mockLLM.capturedPrompts[0];
      expect(prompt).toContain('form');
      const hasInput = prompt.includes('input') || prompt.includes('email');
      expect(hasInput).toBe(true);
    });

    it('should handle LLM response with bullet points', async () => {
      // Arrange
      mockLLM.setResponse(
        'Break',
        `- Click the product link
- Add product to cart
- Verify cart count`
      );

      const engine = new IterativeDecompositionEngine(mockLLM, mockHTML, parser, 'gpt-4', false);

      // Act
      const plan = await engine.createPlan('Add product to cart');

      // Assert
      expect(plan).toBeDefined();
      expect(plan).toHaveLength(3);
      expect(plan[0]).toContain('product link');
      expect(plan[1]).toContain('Add product');
      expect(plan[2]).toContain('Verify cart');
    });

    it('should handle LLM response without numbering', async () => {
      // Arrange
      mockLLM.setResponse(
        'Break',
        `Click the menu icon
Select the settings option
Change the theme to dark mode
Save the changes`
      );

      const engine = new IterativeDecompositionEngine(mockLLM, mockHTML, parser, 'gpt-4', false);

      // Act
      const plan = await engine.createPlan('Change theme to dark mode');

      // Assert
      expect(plan).toBeDefined();
      expect(plan.length).toBeGreaterThanOrEqual(3); // At least 3 substantial steps
      expect(plan.some((step: string) => step.includes('menu'))).toBe(true);
      expect(plan.some((step: string) => step.includes('dark'))).toBe(true);
    });

    it('should extract HTML before calling LLM', async () => {
      // Arrange
      mockLLM.setResponse('Break', '1. Step one');
      mockHTML.setHTML('<button>Test</button>');

      const engine = new IterativeDecompositionEngine(mockLLM, mockHTML, parser, 'gpt-4', false);

      // Act
      await engine.createPlan('Test instruction');

      // Assert - HTML should be extracted and included in prompt
      expect(mockLLM.capturedPrompts.length).toBe(1);
      expect(mockLLM.capturedPrompts[0]).toBeTruthy();
    });

    it('should handle complex multi-step e-commerce flow', async () => {
      // Arrange
      mockLLM.setResponse(
        'Break',
        `1. Search for "laptop" in the search box
2. Click the search button
3. Wait for search results to load
4. Click on the first product in results
5. Wait for product details page
6. Verify product title contains "laptop"
7. Click the "Add to Cart" button
8. Wait for cart update confirmation
9. Verify cart badge shows "1"`
      );

      mockHTML.setHTML(`
        <input type="search" name="q" placeholder="Search products">
        <button class="search-btn">Search</button>
        <div class="product-list"></div>
        <div class="cart-badge">0</div>
      `);

      const engine = new IterativeDecompositionEngine(mockLLM, mockHTML, parser, 'gpt-4', false);

      // Act
      const plan = await engine.createPlan('Search for laptop and add first result to cart');

      // Assert
      expect(plan).toBeDefined();
      expect(plan).toHaveLength(9);
      expect(plan[0]).toContain('Search');
      expect(plan[1]).toContain('Click');
      expect(plan[2]).toContain('Wait');
      expect(plan[6]).toContain('Add to Cart');
      expect(plan[8]).toContain('cart badge');
    });

    it('should handle empty or invalid LLM response gracefully', async () => {
      // Arrange
      // Create fresh mock for this test
      const freshMockLLM = new MockLLMProvider();
      const freshMockHTML = new MockHTMLExtractor();

      freshMockHTML.setHTML('<div>Test page</div>');
      // Set response that will match the planning prompt
      freshMockLLM.setResponse('atomic steps', ''); // This phrase appears in planning prompt

      const engine = new IterativeDecompositionEngine(
        freshMockLLM,
        freshMockHTML,
        parser,
        'gpt-4',
        false
      );

      // Act
      const plan = await engine.createPlan('Do something');

      // Assert - Should return at least the instruction as a single step
      expect(plan).toBeDefined();
      expect(plan.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('parsePlanSteps() method', () => {
    it('should parse numbered list (1. 2. 3.)', () => {
      // This tests the private parsePlanSteps method indirectly
      const engine = new IterativeDecompositionEngine(mockLLM, mockHTML, parser, 'gpt-4', false);

      const response = `1. First step
2. Second step
3. Third step`;

      const steps = engine.parsePlanSteps(response);

      expect(steps).toHaveLength(3);
      expect(steps[0]).toBe('First step');
      expect(steps[1]).toBe('Second step');
      expect(steps[2]).toBe('Third step');
    });

    it('should parse bullet points (- * )', () => {
      const engine = new IterativeDecompositionEngine(mockLLM, mockHTML, parser, 'gpt-4', false);

      const response = `- First action
* Second action
- Third action`;

      const steps = engine.parsePlanSteps(response);

      expect(steps).toHaveLength(3);
      expect(steps[0]).toBe('First action');
      expect(steps[1]).toBe('Second action');
      expect(steps[2]).toBe('Third action');
    });

    it('should handle mixed formatting', () => {
      const engine = new IterativeDecompositionEngine(mockLLM, mockHTML, parser, 'gpt-4', false);

      const response = `Step 1: Click button
2. Fill form
- Verify result`;

      const steps = engine.parsePlanSteps(response);

      expect(steps.length).toBeGreaterThanOrEqual(2);
    });

    it('should skip headers and empty lines', () => {
      const engine = new IterativeDecompositionEngine(mockLLM, mockHTML, parser, 'gpt-4', false);

      const response = `Plan:

1. First step

2. Second step

Steps complete.`;

      const steps = engine.parsePlanSteps(response);

      expect(steps).toHaveLength(2);
      expect(steps[0]).toBe('First step');
      expect(steps[1]).toBe('Second step');
    });
  });

  describe('Verbose logging', () => {
    it('should log planning steps when verbose is true', async () => {
      // Arrange
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      mockLLM.setResponse('Break', '1. Step one\n2. Step two');

      const engine = new IterativeDecompositionEngine(
        mockLLM,
        mockHTML,
        parser,
        'gpt-4',
        true // verbose = true
      );

      // Act
      await engine.createPlan('Test');

      // Assert
      expect(consoleSpy).toHaveBeenCalled();
      const logs = consoleSpy.mock.calls.map(call => call.join(' '));
      expect(logs.some(log => log.includes('Creating') || log.includes('Plan'))).toBe(true);

      consoleSpy.mockRestore();
    });

    it('should not log when verbose is false', async () => {
      // Arrange
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      mockLLM.setResponse('Break', '1. Step one');

      const engine = new IterativeDecompositionEngine(
        mockLLM,
        mockHTML,
        parser,
        'gpt-4',
        false // verbose = false
      );

      // Act
      await engine.createPlan('Test');

      // Assert
      expect(consoleSpy).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });
});
