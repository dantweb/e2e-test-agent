import { IterativeDecompositionEngine } from '../../../src/application/engines/IterativeDecompositionEngine';
import { ILLMProvider, LLMResponse } from '../../../src/infrastructure/llm/interfaces';
import { IHTMLExtractor } from '../../../src/application/interfaces/IHTMLExtractor';
import { OxtestParser } from '../../../src/infrastructure/parsers/OxtestParser';

// Helper to create mock LLM responses
function createMockLLMResponse(content: string): LLMResponse {
  return {
    content,
    usage: {
      promptTokens: 100,
      completionTokens: 50,
      totalTokens: 150,
    },
    model: 'gpt-4',
    finishReason: 'stop',
  };
}

describe('IterativeDecompositionEngine - Language Detection', () => {
  let engine: IterativeDecompositionEngine;
  let mockLLM: jest.Mocked<ILLMProvider>;
  let mockExtractor: jest.Mocked<IHTMLExtractor>;
  let mockParser: jest.Mocked<OxtestParser>;

  beforeEach(() => {
    mockLLM = {
      generate: jest.fn().mockResolvedValue(createMockLLMResponse('PLAN:\n1. Click login button')),
    } as any;

    mockExtractor = {
      extractSimplified: jest.fn().mockResolvedValue('<html lang="en"><body>Test</body></html>'),
    } as any;

    mockParser = {
      parseContent: jest.fn().mockReturnValue([]),
    } as any;

    engine = new IterativeDecompositionEngine(mockLLM, mockExtractor, mockParser, 'gpt-4', false);
  });

  describe('German language detection in planning', () => {
    it('should include German context in planning prompt for German websites', async () => {
      const germanHTML = '<html lang="de"><body><button>Anmelden</button></body></html>';

      mockExtractor.extractSimplified.mockResolvedValue(germanHTML);
      mockLLM.generate.mockResolvedValueOnce(createMockLLMResponse('PLAN:\n1. Click login button'));

      await engine.createPlan('Click login button');

      // Verify LLM was called with language context in prompt
      const llmCall = (mockLLM.generate as jest.Mock).mock.calls[0];
      const userPrompt = llmCall[0];

      expect(userPrompt).toContain('website is in German');
      expect(userPrompt).toContain('Anmelden'); // German translation example
      expect(userPrompt).toContain('Do NOT use English');
    });

    it('should NOT include language context for English websites', async () => {
      const englishHTML = '<html lang="en"><body><button>Login</button></body></html>';

      mockExtractor.extractSimplified.mockResolvedValue(englishHTML);
      mockLLM.generate.mockResolvedValueOnce(createMockLLMResponse('PLAN:\n1. Click login'));

      await engine.createPlan('Click login');

      // Verify LLM was called WITHOUT language context
      const llmCall = (mockLLM.generate as jest.Mock).mock.calls[0];
      const userPrompt = llmCall[0];

      expect(userPrompt).not.toContain('website is in German');
      expect(userPrompt).not.toContain('Anmelden');
    });

    it('should handle French language', async () => {
      const frenchHTML = '<html lang="fr"><body><button>Connexion</button></body></html>';

      mockExtractor.extractSimplified.mockResolvedValue(frenchHTML);
      mockLLM.generate.mockResolvedValueOnce(createMockLLMResponse('PLAN:\n1. Click login'));

      await engine.createPlan('Click login');

      const llmCall = (mockLLM.generate as jest.Mock).mock.calls[0];
      const userPrompt = llmCall[0];

      expect(userPrompt).toContain('website is in French');
      expect(userPrompt).toContain('Connexion'); // French translation example
    });

    it('should handle Spanish language', async () => {
      const spanishHTML = '<html lang="es"><body><button>Iniciar sesión</button></body></html>';

      mockExtractor.extractSimplified.mockResolvedValue(spanishHTML);
      mockLLM.generate.mockResolvedValueOnce(createMockLLMResponse('PLAN:\n1. Click login'));

      await engine.createPlan('Click login');

      const llmCall = (mockLLM.generate as jest.Mock).mock.calls[0];
      const userPrompt = llmCall[0];

      expect(userPrompt).toContain('website is in Spanish');
      expect(userPrompt).toContain('Iniciar sesión'); // Spanish translation example
    });
  });

  describe('German language detection in command generation', () => {
    it('should include German context in command generation prompt', async () => {
      const germanHTML = '<html lang="de"><body><button>Anmelden</button></body></html>';

      mockExtractor.extractSimplified.mockResolvedValue(germanHTML);
      mockLLM.generate.mockResolvedValueOnce(createMockLLMResponse('click text="Anmelden"'));
      mockParser.parseContent.mockReturnValueOnce([
        { type: 'click', selector: { strategy: 'text', value: 'Anmelden' } } as any,
      ]);

      await engine.generateCommandForStep('Click login', 'Test login flow');

      const llmCall = (mockLLM.generate as jest.Mock).mock.calls[0];
      const userPrompt = llmCall[0];

      expect(userPrompt).toContain('website is in German');
      expect(userPrompt).toContain('Anmelden');
      expect(userPrompt).toContain('Do NOT use English');
    });

    it('should NOT include language context for English in command generation', async () => {
      const englishHTML = '<html lang="en"><body><button>Login</button></body></html>';

      mockExtractor.extractSimplified.mockResolvedValue(englishHTML);
      mockLLM.generate.mockResolvedValueOnce(createMockLLMResponse('click text="Login"'));
      mockParser.parseContent.mockReturnValueOnce([
        { type: 'click', selector: { strategy: 'text', value: 'Login' } } as any,
      ]);

      await engine.generateCommandForStep('Click login', 'Test login flow');

      const llmCall = (mockLLM.generate as jest.Mock).mock.calls[0];
      const userPrompt = llmCall[0];

      expect(userPrompt).not.toContain('website is in German');
      expect(userPrompt).not.toContain('Anmelden');
    });
  });

  describe('German language detection in refinement', () => {
    it('should include German context in refinement prompt', async () => {
      const germanHTML = '<html lang="de"><body><button>Anmelden</button></body></html>';
      const command = {
        type: 'click',
        selector: { strategy: 'text', value: 'Login' },
      } as any;
      const issues = ['Selector not found in HTML'];

      mockLLM.generate.mockResolvedValueOnce(createMockLLMResponse('click text="Anmelden"'));
      mockParser.parseContent.mockReturnValueOnce([
        { type: 'click', selector: { strategy: 'text', value: 'Anmelden' } } as any,
      ]);

      await engine.refineCommand(command, issues, germanHTML);

      const llmCall = (mockLLM.generate as jest.Mock).mock.calls[0];
      const userPrompt = llmCall[0];

      expect(userPrompt).toContain('website is in German');
      expect(userPrompt).toContain('Anmelden');
      expect(userPrompt).toContain('Do NOT use English');
    });

    it('should NOT include language context for English in refinement', async () => {
      const englishHTML = '<html lang="en"><body><button>Login</button></body></html>';
      const command = {
        type: 'click',
        selector: { strategy: 'css', value: '.login-btn' },
      } as any;
      const issues = ['Selector not found in HTML'];

      mockLLM.generate.mockResolvedValueOnce(createMockLLMResponse('click text="Login"'));
      mockParser.parseContent.mockReturnValueOnce([
        { type: 'click', selector: { strategy: 'text', value: 'Login' } } as any,
      ]);

      await engine.refineCommand(command, issues, englishHTML);

      const llmCall = (mockLLM.generate as jest.Mock).mock.calls[0];
      const userPrompt = llmCall[0];

      expect(userPrompt).not.toContain('website is in German');
      expect(userPrompt).not.toContain('Anmelden');
    });
  });

  describe('Unsupported languages', () => {
    it('should provide generic context for Italian', async () => {
      const italianHTML = '<html lang="it"><body><button>Accedi</button></body></html>';

      mockExtractor.extractSimplified.mockResolvedValue(italianHTML);
      mockLLM.generate.mockResolvedValueOnce(createMockLLMResponse('PLAN:\n1. Click login'));

      await engine.createPlan('Click login');

      const llmCall = (mockLLM.generate as jest.Mock).mock.calls[0];
      const userPrompt = llmCall[0];

      expect(userPrompt).toContain('website is in Italian');
      expect(userPrompt).toContain('Italian text for selectors');
    });
  });
});
