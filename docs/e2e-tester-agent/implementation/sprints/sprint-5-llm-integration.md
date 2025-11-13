# Sprint 5: LLM Integration

**Duration**: 1 week (5 days)
**Status**: ⏸️ Not Started
**Dependencies**: Sprint 1 (Domain)

## Goal

Implement LLM provider abstraction with support for OpenAI and Anthropic, including prompt engineering for iterative discovery and oxtest generation.

## Tasks

### Day 1: LLM Provider Interface

#### Task 1: LLM Provider Interface & Types ⏸️

**TDD Approach**:
```typescript
// tests/unit/infrastructure/llm/LLMProvider.test.ts
describe('LLMProvider Interface', () => {
  it('should define provider interface', () => {
    interface ILLMProvider {
      generate(prompt: string, context?: LLMContext): Promise<LLMResponse>;
      streamGenerate(prompt: string, context?: LLMContext): AsyncGenerator<string>;
    }

    // Type checks
    const provider: ILLMProvider = {
      generate: async () => ({ content: '', usage: { tokens: 0 } }),
      streamGenerate: async function* () { yield ''; }
    };

    expect(provider).toBeDefined();
  });

  it('should define context and response types', () => {
    const context: LLMContext = {
      model: 'gpt-4',
      temperature: 0.7,
      maxTokens: 2000,
      systemPrompt: 'You are a test automation assistant'
    };

    const response: LLMResponse = {
      content: 'Generated text',
      usage: {
        promptTokens: 100,
        completionTokens: 50,
        totalTokens: 150
      },
      model: 'gpt-4',
      finishReason: 'stop'
    };

    expect(context).toBeDefined();
    expect(response).toBeDefined();
  });
});
```

**Implementation** (src/infrastructure/llm/interfaces.ts):
```typescript
export interface LLMContext {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
}

export interface LLMResponse {
  content: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model: string;
  finishReason: 'stop' | 'length' | 'error';
}

export interface ILLMProvider {
  generate(prompt: string, context?: LLMContext): Promise<LLMResponse>;
  streamGenerate(prompt: string, context?: LLMContext): AsyncGenerator<string, void, unknown>;
}
```

**Acceptance Criteria**:
- [ ] Interface defined
- [ ] Type-safe context and response
- [ ] Stream support
- [ ] 100% type coverage

**Estimated Time**: 2 hours

---

### Day 2: OpenAI Provider

#### Task 2: OpenAI LLM Provider ⏸️

**TDD Approach**:
```typescript
// tests/unit/infrastructure/llm/OpenAILLMProvider.test.ts
import { OpenAI } from 'openai';

describe('OpenAILLMProvider', () => {
  let provider: OpenAILLMProvider;
  let mockClient: jest.Mocked<OpenAI>;

  beforeEach(() => {
    mockClient = {
      chat: {
        completions: {
          create: jest.fn()
        }
      }
    } as any;

    provider = new OpenAILLMProvider('fake-api-key', mockClient);
  });

  it('should generate response', async () => {
    mockClient.chat.completions.create.mockResolvedValue({
      choices: [{
        message: { role: 'assistant', content: 'Generated content' },
        finish_reason: 'stop'
      }],
      usage: {
        prompt_tokens: 100,
        completion_tokens: 50,
        total_tokens: 150
      },
      model: 'gpt-4'
    } as any);

    const response = await provider.generate('Test prompt');

    expect(response.content).toBe('Generated content');
    expect(response.usage.totalTokens).toBe(150);
  });

  it('should use system prompt', async () => {
    mockClient.chat.completions.create.mockResolvedValue({
      choices: [{ message: { content: 'Response' }, finish_reason: 'stop' }],
      usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
      model: 'gpt-4'
    } as any);

    await provider.generate('Test', {
      systemPrompt: 'You are a testing assistant'
    });

    expect(mockClient.chat.completions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: expect.arrayContaining([
          { role: 'system', content: 'You are a testing assistant' }
        ])
      })
    );
  });

  it('should use conversation history', async () => {
    mockClient.chat.completions.create.mockResolvedValue({
      choices: [{ message: { content: 'Response' }, finish_reason: 'stop' }],
      usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
      model: 'gpt-4'
    } as any);

    await provider.generate('Continue', {
      conversationHistory: [
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi there!' }
      ]
    });

    expect(mockClient.chat.completions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: expect.arrayContaining([
          { role: 'user', content: 'Hello' },
          { role: 'assistant', content: 'Hi there!' },
          { role: 'user', content: 'Continue' }
        ])
      })
    );
  });

  it('should handle API errors', async () => {
    mockClient.chat.completions.create.mockRejectedValue(
      new Error('API Error: Rate limit exceeded')
    );

    await expect(provider.generate('Test'))
      .rejects
      .toThrow('OpenAI API error');
  });

  it('should support streaming', async () => {
    const mockStream = {
      async *[Symbol.asyncIterator]() {
        yield { choices: [{ delta: { content: 'Hello ' } }] };
        yield { choices: [{ delta: { content: 'World' } }] };
      }
    };

    mockClient.chat.completions.create.mockResolvedValue(mockStream as any);

    const chunks: string[] = [];
    for await (const chunk of provider.streamGenerate('Test')) {
      chunks.push(chunk);
    }

    expect(chunks).toEqual(['Hello ', 'World']);
  });
});
```

**Implementation** (src/infrastructure/llm/OpenAILLMProvider.ts):
```typescript
import { OpenAI } from 'openai';
import { ILLMProvider, LLMContext, LLMResponse } from './interfaces';

export class OpenAILLMProvider implements ILLMProvider {
  private readonly client: OpenAI;

  constructor(apiKey: string, client?: OpenAI) {
    this.client = client || new OpenAI({ apiKey });
  }

  async generate(prompt: string, context?: LLMContext): Promise<LLMResponse> {
    try {
      const messages = this.buildMessages(prompt, context);

      const response = await this.client.chat.completions.create({
        model: context?.model || 'gpt-4',
        messages,
        temperature: context?.temperature ?? 0.7,
        max_tokens: context?.maxTokens ?? 2000
      });

      const choice = response.choices[0];
      if (!choice) {
        throw new Error('No response from OpenAI');
      }

      return {
        content: choice.message.content || '',
        usage: {
          promptTokens: response.usage?.prompt_tokens || 0,
          completionTokens: response.usage?.completion_tokens || 0,
          totalTokens: response.usage?.total_tokens || 0
        },
        model: response.model,
        finishReason: choice.finish_reason as any
      };
    } catch (error) {
      throw new Error(`OpenAI API error: ${(error as Error).message}`);
    }
  }

  async *streamGenerate(prompt: string, context?: LLMContext): AsyncGenerator<string> {
    const messages = this.buildMessages(prompt, context);

    const stream = await this.client.chat.completions.create({
      model: context?.model || 'gpt-4',
      messages,
      temperature: context?.temperature ?? 0.7,
      max_tokens: context?.maxTokens ?? 2000,
      stream: true
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        yield content;
      }
    }
  }

  private buildMessages(
    prompt: string,
    context?: LLMContext
  ): Array<{ role: string; content: string }> {
    const messages: Array<{ role: string; content: string }> = [];

    if (context?.systemPrompt) {
      messages.push({ role: 'system', content: context.systemPrompt });
    }

    if (context?.conversationHistory) {
      messages.push(...context.conversationHistory);
    }

    messages.push({ role: 'user', content: prompt });

    return messages;
  }
}
```

**Acceptance Criteria**:
- [ ] Generate responses
- [ ] Support streaming
- [ ] Use system prompts
- [ ] Conversation history
- [ ] Error handling
- [ ] 100% test coverage

**Estimated Time**: 5 hours

---

### Day 3: Anthropic Provider

#### Task 3: Anthropic LLM Provider ⏸️

**TDD Approach**:
```typescript
// tests/unit/infrastructure/llm/AnthropicLLMProvider.test.ts
import Anthropic from '@anthropic-ai/sdk';

describe('AnthropicLLMProvider', () => {
  let provider: AnthropicLLMProvider;
  let mockClient: jest.Mocked<Anthropic>;

  beforeEach(() => {
    mockClient = {
      messages: {
        create: jest.fn()
      }
    } as any;

    provider = new AnthropicLLMProvider('fake-api-key', mockClient);
  });

  it('should generate response', async () => {
    mockClient.messages.create.mockResolvedValue({
      content: [{ type: 'text', text: 'Generated content' }],
      usage: {
        input_tokens: 100,
        output_tokens: 50
      },
      model: 'claude-3-opus-20240229',
      stop_reason: 'end_turn'
    } as any);

    const response = await provider.generate('Test prompt');

    expect(response.content).toBe('Generated content');
    expect(response.usage.totalTokens).toBe(150);
  });

  it('should use system prompt', async () => {
    mockClient.messages.create.mockResolvedValue({
      content: [{ type: 'text', text: 'Response' }],
      usage: { input_tokens: 0, output_tokens: 0 },
      model: 'claude-3-opus-20240229',
      stop_reason: 'end_turn'
    } as any);

    await provider.generate('Test', {
      systemPrompt: 'You are a testing assistant'
    });

    expect(mockClient.messages.create).toHaveBeenCalledWith(
      expect.objectContaining({
        system: 'You are a testing assistant'
      })
    );
  });

  it('should support streaming', async () => {
    const mockStream = {
      async *[Symbol.asyncIterator]() {
        yield { type: 'content_block_delta', delta: { text: 'Hello ' } };
        yield { type: 'content_block_delta', delta: { text: 'World' } };
      }
    };

    mockClient.messages.create.mockResolvedValue(mockStream as any);

    const chunks: string[] = [];
    for await (const chunk of provider.streamGenerate('Test')) {
      chunks.push(chunk);
    }

    expect(chunks).toEqual(['Hello ', 'World']);
  });
});
```

**Implementation** (src/infrastructure/llm/AnthropicLLMProvider.ts):
```typescript
import Anthropic from '@anthropic-ai/sdk';
import { ILLMProvider, LLMContext, LLMResponse } from './interfaces';

export class AnthropicLLMProvider implements ILLMProvider {
  private readonly client: Anthropic;

  constructor(apiKey: string, client?: Anthropic) {
    this.client = client || new Anthropic({ apiKey });
  }

  async generate(prompt: string, context?: LLMContext): Promise<LLMResponse> {
    try {
      const messages = this.buildMessages(prompt, context);

      const response = await this.client.messages.create({
        model: context?.model || 'claude-3-opus-20240229',
        messages,
        system: context?.systemPrompt,
        temperature: context?.temperature ?? 0.7,
        max_tokens: context?.maxTokens ?? 2000
      });

      const textContent = response.content
        .filter(c => c.type === 'text')
        .map(c => (c as any).text)
        .join('');

      return {
        content: textContent,
        usage: {
          promptTokens: response.usage.input_tokens,
          completionTokens: response.usage.output_tokens,
          totalTokens: response.usage.input_tokens + response.usage.output_tokens
        },
        model: response.model,
        finishReason: response.stop_reason as any
      };
    } catch (error) {
      throw new Error(`Anthropic API error: ${(error as Error).message}`);
    }
  }

  async *streamGenerate(prompt: string, context?: LLMContext): AsyncGenerator<string> {
    const messages = this.buildMessages(prompt, context);

    const stream = await this.client.messages.create({
      model: context?.model || 'claude-3-opus-20240229',
      messages,
      system: context?.systemPrompt,
      temperature: context?.temperature ?? 0.7,
      max_tokens: context?.maxTokens ?? 2000,
      stream: true
    });

    for await (const event of stream) {
      if (event.type === 'content_block_delta' && 'text' in event.delta) {
        yield event.delta.text;
      }
    }
  }

  private buildMessages(
    prompt: string,
    context?: LLMContext
  ): Array<{ role: 'user' | 'assistant'; content: string }> {
    const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [];

    if (context?.conversationHistory) {
      messages.push(...context.conversationHistory);
    }

    messages.push({ role: 'user', content: prompt });

    return messages;
  }
}
```

**Acceptance Criteria**:
- [ ] Generate responses
- [ ] Support streaming
- [ ] Use system prompts
- [ ] Conversation history
- [ ] Error handling
- [ ] 100% test coverage

**Estimated Time**: 4 hours

---

### Day 4: Provider Factory

#### Task 4: LLM Provider Factory ⏸️

**TDD Approach**:
```typescript
// tests/unit/infrastructure/llm/LLMProviderFactory.test.ts
describe('LLMProviderFactory', () => {
  it('should create OpenAI provider', () => {
    const factory = new LLMProviderFactory();
    const provider = factory.create('openai', 'fake-key');

    expect(provider).toBeInstanceOf(OpenAILLMProvider);
  });

  it('should create Anthropic provider', () => {
    const factory = new LLMProviderFactory();
    const provider = factory.create('anthropic', 'fake-key');

    expect(provider).toBeInstanceOf(AnthropicLLMProvider);
  });

  it('should throw on unknown provider', () => {
    const factory = new LLMProviderFactory();

    expect(() => factory.create('unknown' as any, 'key'))
      .toThrow('Unknown LLM provider');
  });

  it('should create from environment variables', () => {
    process.env.LLM_PROVIDER = 'openai';
    process.env.OPENAI_API_KEY = 'fake-key';

    const factory = new LLMProviderFactory();
    const provider = factory.createFromEnv();

    expect(provider).toBeInstanceOf(OpenAILLMProvider);
  });
});
```

**Implementation** (src/infrastructure/llm/LLMProviderFactory.ts):
```typescript
import { ILLMProvider } from './interfaces';
import { OpenAILLMProvider } from './OpenAILLMProvider';
import { AnthropicLLMProvider } from './AnthropicLLMProvider';

export type LLMProviderType = 'openai' | 'anthropic';

export class LLMProviderFactory {
  create(provider: LLMProviderType, apiKey: string): ILLMProvider {
    switch (provider) {
      case 'openai':
        return new OpenAILLMProvider(apiKey);

      case 'anthropic':
        return new AnthropicLLMProvider(apiKey);

      default:
        throw new Error(`Unknown LLM provider: ${provider}`);
    }
  }

  createFromEnv(): ILLMProvider {
    const provider = process.env.LLM_PROVIDER as LLMProviderType;
    if (!provider) {
      throw new Error('LLM_PROVIDER environment variable not set');
    }

    let apiKey: string;
    switch (provider) {
      case 'openai':
        apiKey = process.env.OPENAI_API_KEY || '';
        break;
      case 'anthropic':
        apiKey = process.env.ANTHROPIC_API_KEY || '';
        break;
      default:
        throw new Error(`Unknown LLM provider: ${provider}`);
    }

    if (!apiKey) {
      throw new Error(`API key not found for provider: ${provider}`);
    }

    return this.create(provider, apiKey);
  }
}
```

**Acceptance Criteria**:
- [ ] Create OpenAI provider
- [ ] Create Anthropic provider
- [ ] Create from env vars
- [ ] Error handling
- [ ] 100% test coverage

**Estimated Time**: 2 hours

---

### Day 5: Prompt Engineering

#### Task 5: Oxtest Generation Prompts ⏸️

**TDD Approach**:
```typescript
// tests/unit/infrastructure/llm/OxtestPromptBuilder.test.ts
describe('OxtestPromptBuilder', () => {
  let builder: OxtestPromptBuilder;

  beforeEach(() => {
    builder = new OxtestPromptBuilder();
  });

  it('should build initial discovery prompt', () => {
    const prompt = builder.buildDiscoveryPrompt(
      'Login with username and password',
      '<html><body><form>...</form></body></html>'
    );

    expect(prompt).toContain('Login with username and password');
    expect(prompt).toContain('<form>');
    expect(prompt).toContain('oxtest');
  });

  it('should include conversation history', () => {
    const history = [
      { role: 'user' as const, content: 'Navigate to site' },
      { role: 'assistant' as const, content: 'navigate url=https://site.com' }
    ];

    const prompt = builder.buildRefinementPrompt(
      'Now click login button',
      '<html>...</html>',
      history
    );

    expect(prompt).toContain('Navigate to site');
    expect(prompt).toContain('navigate url=https://site.com');
  });

  it('should build system prompt', () => {
    const systemPrompt = builder.buildSystemPrompt();

    expect(systemPrompt).toContain('oxtest');
    expect(systemPrompt).toContain('selector');
    expect(systemPrompt).toContain('fallback');
  });
});
```

**Implementation** (src/infrastructure/llm/OxtestPromptBuilder.ts):
```typescript
export class OxtestPromptBuilder {
  buildSystemPrompt(): string {
    return `You are an expert E2E test automation assistant. Your task is to generate oxtest commands based on HTML/DOM content and user instructions.

Oxtest is a simple, human-readable format with this syntax:
- command selector param=value
- Selectors: css=, xpath=, text=, placeholder=, label=, role=, testid=
- Fallbacks: selector fallback=alternate_selector

Commands:
- navigate url=<url>
- click <selector>
- type <selector> value=<text>
- hover <selector>
- wait timeout=<ms>
- wait_for <selector> timeout=<ms>
- assert_exists <selector>
- assert_not_exists <selector>
- assert_visible <selector>
- assert_text <selector> value=<expected>
- assert_url pattern=<regex>

Generate ONE oxtest command at a time based on the current HTML and instruction.
Always prefer specific selectors (css, testid) with text fallbacks for robustness.`;
  }

  buildDiscoveryPrompt(instruction: string, html: string): string {
    return `Based on the HTML below, generate the NEXT oxtest command to accomplish: "${instruction}"

Current HTML:
\`\`\`html
${this.truncateHTML(html)}
\`\`\`

Generate ONE oxtest command. Be specific with selectors and include a fallback if appropriate.`;
  }

  buildRefinementPrompt(
    instruction: string,
    html: string,
    history: Array<{ role: 'user' | 'assistant'; content: string }>
  ): string {
    const historyText = history
      .map(h => `${h.role === 'user' ? 'Instruction' : 'Generated'}: ${h.content}`)
      .join('\n');

    return `Previous steps:
${historyText}

Current HTML:
\`\`\`html
${this.truncateHTML(html)}
\`\`\`

Next instruction: "${instruction}"

Generate the NEXT oxtest command.`;
  }

  private truncateHTML(html: string, maxLength = 10000): string {
    if (html.length <= maxLength) {
      return html;
    }
    return html.substring(0, maxLength) + '\n... (truncated)';
  }
}
```

**Acceptance Criteria**:
- [ ] System prompt defined
- [ ] Discovery prompt builder
- [ ] Refinement prompt builder
- [ ] HTML truncation
- [ ] 100% test coverage

**Estimated Time**: 3 hours

---

## Checklist

- [ ] Task 1: LLM provider interface
- [ ] Task 2: OpenAI provider
- [ ] Task 3: Anthropic provider
- [ ] Task 4: Provider factory
- [ ] Task 5: Prompt engineering

## Definition of Done

- ✅ Both providers implemented
- ✅ Factory pattern working
- ✅ Streaming support
- ✅ Prompt builders complete
- ✅ 85%+ test coverage
- ✅ All tests passing
- ✅ Error handling comprehensive
- ✅ JSDoc comments complete
- ✅ Code reviewed

## Next Sprint

[Sprint 6: Decomposition Engine](./sprint-6-decomposition.md)

---

**Last Updated**: November 13, 2025
