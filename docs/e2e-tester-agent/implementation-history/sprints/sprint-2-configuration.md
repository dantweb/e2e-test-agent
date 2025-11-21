# Sprint 2: Configuration Layer

**Duration**: 3 days
**Status**: ⏸️ Not Started
**Dependencies**: Sprint 1 (Domain Layer)

## Goal

Implement YAML configuration parsing with Zod schema validation, environment variable resolution, and comprehensive error handling.

## Tasks

### Day 1: Schema Definition

#### Task 1: Zod Schema Definition ⏸️

**TDD Approach**:
```typescript
// tests/unit/configuration/ConfigSchema.test.ts
describe('ConfigSchema', () => {
  it('should validate valid YAML config', () => {
    const config = {
      name: 'Login Test',
      description: 'Test user login',
      environment: {
        BASE_URL: 'https://shop.dev',
        TEST_USER: 'admin'
      },
      tests: [
        {
          name: 'Login flow',
          steps: [
            {
              action: 'navigate',
              prompt: 'Go to ${BASE_URL}'
            }
          ],
          validation: {
            url_contains: '/home'
          }
        }
      ]
    };

    const result = ConfigSchema.safeParse(config);
    expect(result.success).toBe(true);
  });

  it('should reject config without name', () => {
    const config = {
      tests: []
    };

    const result = ConfigSchema.safeParse(config);
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toContain('name');
  });

  it('should validate action types', () => {
    const config = {
      name: 'Test',
      tests: [{
        name: 'Test',
        steps: [{
          action: 'invalid_action',
          prompt: 'Do something'
        }]
      }]
    };

    const result = ConfigSchema.safeParse(config);
    expect(result.success).toBe(false);
  });
});
```

**Implementation** (src/configuration/schema/ConfigSchema.ts):
```typescript
import { z } from 'zod';

const ActionTypeSchema = z.enum([
  'navigate',
  'click',
  'type',
  'hover',
  'keypress',
  'wait',
  'assert'
]);

const StepSchema = z.object({
  action: ActionTypeSchema,
  prompt: z.string().min(1),
  timeout: z.number().optional()
});

const ValidationSchema = z.object({
  url_contains: z.string().optional(),
  element_exists: z.string().optional(),
  element_not_exists: z.string().optional(),
  text_visible: z.string().optional(),
  page_title: z.string().optional()
}).refine(
  data => Object.values(data).some(v => v !== undefined),
  { message: 'At least one validation rule required' }
);

const TestSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  steps: z.array(StepSchema).min(1),
  validation: ValidationSchema
});

export const ConfigSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  environment: z.record(z.string(), z.string()).optional(),
  tests: z.array(TestSchema).min(1)
});

export type Config = z.infer<typeof ConfigSchema>;
export type Test = z.infer<typeof TestSchema>;
export type Step = z.infer<typeof StepSchema>;
export type Validation = z.infer<typeof ValidationSchema>;
```

**Acceptance Criteria**:
- [ ] Complete Zod schema defined
- [ ] Type inference working
- [ ] Custom validation rules
- [ ] Helpful error messages
- [ ] 100% test coverage

**Estimated Time**: 3 hours

---

### Day 2: YAML Parser

#### Task 2: YAML Parser Implementation ⏸️

**TDD Approach**:
```typescript
// tests/unit/configuration/YamlConfigParser.test.ts
describe('YamlConfigParser', () => {
  let parser: YamlConfigParser;

  beforeEach(() => {
    parser = new YamlConfigParser();
  });

  it('should parse valid YAML file', async () => {
    const yamlContent = `
name: Login Test
description: Test user login
environment:
  BASE_URL: https://shop.dev
  TEST_USER: admin
tests:
  - name: Login flow
    steps:
      - action: navigate
        prompt: Go to \${BASE_URL}
      - action: type
        prompt: Enter username \${TEST_USER}
    validation:
      url_contains: /home
`;

    const config = await parser.parseContent(yamlContent);

    expect(config.name).toBe('Login Test');
    expect(config.tests).toHaveLength(1);
    expect(config.environment?.BASE_URL).toBe('https://shop.dev');
  });

  it('should parse YAML from file', async () => {
    const config = await parser.parseFile('./fixtures/valid-config.yaml');
    expect(config.name).toBeDefined();
  });

  it('should throw on invalid YAML syntax', async () => {
    const invalid = `
name: Test
  invalid indentation
`;

    await expect(parser.parseContent(invalid))
      .rejects
      .toThrow('Invalid YAML syntax');
  });

  it('should throw on schema validation error', async () => {
    const invalid = `
name: Test
tests: []
`;

    await expect(parser.parseContent(invalid))
      .rejects
      .toThrow('Validation error: tests must have at least 1 item');
  });

  it('should provide detailed error location', async () => {
    const invalid = `
name: Test
tests:
  - name: Test 1
    steps:
      - action: invalid_action
        prompt: Do something
    validation:
      url_contains: /home
`;

    try {
      await parser.parseContent(invalid);
      fail('Should have thrown');
    } catch (error) {
      expect(error.message).toContain('tests[0].steps[0].action');
    }
  });
});
```

**Implementation** (src/configuration/YamlConfigParser.ts):
```typescript
import * as yaml from 'yaml';
import * as fs from 'fs/promises';
import { ConfigSchema, Config } from './schema/ConfigSchema';
import { ZodError } from 'zod';

export class YamlConfigParser {
  async parseFile(filePath: string): Promise<Config> {
    const content = await fs.readFile(filePath, 'utf-8');
    return this.parseContent(content);
  }

  async parseContent(content: string): Promise<Config> {
    let parsed: unknown;

    try {
      parsed = yaml.parse(content);
    } catch (error) {
      throw new Error(`Invalid YAML syntax: ${(error as Error).message}`);
    }

    try {
      return ConfigSchema.parse(parsed);
    } catch (error) {
      if (error instanceof ZodError) {
        const formatted = this.formatValidationError(error);
        throw new Error(`Validation error: ${formatted}`);
      }
      throw error;
    }
  }

  private formatValidationError(error: ZodError): string {
    return error.issues
      .map(issue => {
        const path = issue.path.join('.');
        return `${path}: ${issue.message}`;
      })
      .join('; ');
  }
}
```

**Acceptance Criteria**:
- [ ] Parse YAML from file
- [ ] Parse YAML from string
- [ ] Validate with Zod schema
- [ ] Detailed error messages
- [ ] 100% test coverage

**Estimated Time**: 3 hours

---

#### Task 3: Environment Variable Resolver ⏸️

**TDD Approach**:
```typescript
// tests/unit/configuration/EnvironmentResolver.test.ts
describe('EnvironmentResolver', () => {
  let resolver: EnvironmentResolver;

  beforeEach(() => {
    resolver = new EnvironmentResolver();
  });

  it('should resolve environment variables', () => {
    const env = {
      BASE_URL: 'https://shop.dev',
      TEST_USER: 'admin'
    };

    const result = resolver.resolve('Go to ${BASE_URL}', env);
    expect(result).toBe('Go to https://shop.dev');
  });

  it('should resolve multiple variables', () => {
    const env = {
      USER: 'admin',
      PASS: 'secret'
    };

    const result = resolver.resolve('Login as ${USER} with ${PASS}', env);
    expect(result).toBe('Login as admin with secret');
  });

  it('should throw on undefined variable', () => {
    const env = { USER: 'admin' };

    expect(() => resolver.resolve('Use ${PASS}', env))
      .toThrow('Undefined variable: PASS');
  });

  it('should resolve nested objects', () => {
    const config = {
      name: 'Test',
      tests: [{
        name: 'Login',
        steps: [{
          action: 'navigate' as const,
          prompt: 'Go to ${BASE_URL}'
        }]
      }]
    };
    const env = { BASE_URL: 'https://shop.dev' };

    const resolved = resolver.resolveConfig(config, env);

    expect(resolved.tests[0].steps[0].prompt).toBe('Go to https://shop.dev');
  });

  it('should handle escaping', () => {
    const env = { VAR: 'value' };

    const result = resolver.resolve('Use \\${VAR} literal', env);
    expect(result).toBe('Use ${VAR} literal');
  });
});
```

**Implementation** (src/configuration/EnvironmentResolver.ts):
```typescript
import { Config } from './schema/ConfigSchema';

export class EnvironmentResolver {
  private readonly varPattern = /\$\{([^}]+)\}/g;

  resolve(text: string, env: Record<string, string>): string {
    return text.replace(this.varPattern, (match, varName: string) => {
      if (!(varName in env)) {
        throw new Error(`Undefined variable: ${varName}`);
      }
      return env[varName];
    });
  }

  resolveConfig(config: Config, env?: Record<string, string>): Config {
    const environment = { ...env, ...config.environment };

    return {
      ...config,
      tests: config.tests.map(test => ({
        ...test,
        steps: test.steps.map(step => ({
          ...step,
          prompt: this.resolve(step.prompt, environment)
        })),
        validation: this.resolveValidation(test.validation, environment)
      }))
    };
  }

  private resolveValidation(
    validation: Config['tests'][0]['validation'],
    env: Record<string, string>
  ): Config['tests'][0]['validation'] {
    const result: Config['tests'][0]['validation'] = {};

    for (const [key, value] of Object.entries(validation)) {
      if (value !== undefined) {
        result[key as keyof typeof validation] = this.resolve(value, env);
      }
    }

    return result;
  }
}
```

**Acceptance Criteria**:
- [ ] Resolve ${VAR} syntax
- [ ] Handle undefined variables
- [ ] Resolve nested structures
- [ ] Handle escaping
- [ ] 100% test coverage

**Estimated Time**: 3 hours

---

### Day 3: Integration and Error Handling

#### Task 4: Configuration Factory ⏸️

**TDD Approach**:
```typescript
// tests/integration/configuration/ConfigurationFactory.test.ts
describe('ConfigurationFactory', () => {
  let factory: ConfigurationFactory;

  beforeEach(() => {
    factory = new ConfigurationFactory();
  });

  it('should load and resolve config from file', async () => {
    const config = await factory.loadFromFile('./fixtures/test-config.yaml');

    expect(config.name).toBeDefined();
    expect(config.tests).toHaveLength(1);
    // Environment variables should be resolved
    expect(config.tests[0].steps[0].prompt).not.toContain('${');
  });

  it('should merge environment variables', async () => {
    const customEnv = { CUSTOM_VAR: 'custom' };
    const config = await factory.loadFromFile(
      './fixtures/test-config.yaml',
      customEnv
    );

    const hasCustom = JSON.stringify(config).includes('custom');
    expect(hasCustom).toBe(true);
  });

  it('should provide validation summary', async () => {
    try {
      await factory.loadFromFile('./fixtures/invalid-config.yaml');
      fail('Should throw');
    } catch (error) {
      expect(error.message).toContain('Validation error');
      expect(error.summary).toBeDefined();
    }
  });
});
```

**Implementation** (src/configuration/ConfigurationFactory.ts):
```typescript
import { Config } from './schema/ConfigSchema';
import { YamlConfigParser } from './YamlConfigParser';
import { EnvironmentResolver } from './EnvironmentResolver';

export class ConfigurationFactory {
  private readonly parser: YamlConfigParser;
  private readonly resolver: EnvironmentResolver;

  constructor() {
    this.parser = new YamlConfigParser();
    this.resolver = new EnvironmentResolver();
  }

  async loadFromFile(
    filePath: string,
    additionalEnv?: Record<string, string>
  ): Promise<Config> {
    const config = await this.parser.parseFile(filePath);
    return this.resolver.resolveConfig(config, additionalEnv);
  }

  async loadFromContent(
    content: string,
    additionalEnv?: Record<string, string>
  ): Promise<Config> {
    const config = await this.parser.parseContent(content);
    return this.resolver.resolveConfig(config, additionalEnv);
  }
}
```

**Acceptance Criteria**:
- [ ] Load from file
- [ ] Load from content
- [ ] Merge environments
- [ ] Error aggregation
- [ ] 100% test coverage

**Estimated Time**: 2 hours

---

#### Task 5: Integration Tests ⏸️

**TDD Approach**:
```typescript
// tests/integration/configuration/FullConfigurationFlow.test.ts
describe('Full Configuration Flow', () => {
  it('should parse complex real-world config', async () => {
    const factory = new ConfigurationFactory();
    const config = await factory.loadFromFile('./fixtures/complex-config.yaml');

    expect(config.tests.length).toBeGreaterThan(0);
    expect(config.tests.every(t => t.steps.length > 0)).toBe(true);
    expect(config.tests.every(t => t.validation)).toBeDefined();
  });

  it('should handle all validation types', async () => {
    const yaml = `
name: Validation Test
tests:
  - name: All validations
    steps:
      - action: navigate
        prompt: Go to homepage
    validation:
      url_contains: /home
      element_exists: .success
      text_visible: Welcome
`;

    const factory = new ConfigurationFactory();
    const config = await factory.loadFromContent(yaml);

    const val = config.tests[0].validation;
    expect(val.url_contains).toBe('/home');
    expect(val.element_exists).toBe('.success');
    expect(val.text_visible).toBe('Welcome');
  });
});
```

**Acceptance Criteria**:
- [ ] End-to-end config loading
- [ ] Complex config handling
- [ ] All validation types tested
- [ ] Configuration layer 90%+ coverage

**Estimated Time**: 2 hours

---

## Checklist

- [ ] Task 1: Zod schema definition
- [ ] Task 2: YAML parser
- [ ] Task 3: Environment resolver
- [ ] Task 4: Configuration factory
- [ ] Task 5: Integration tests

## Definition of Done

- ✅ All configuration components implemented
- ✅ 90%+ test coverage
- ✅ All tests passing
- ✅ Helpful validation errors
- ✅ Environment resolution working
- ✅ Complex configs supported
- ✅ JSDoc comments complete
- ✅ Code reviewed

## Next Sprint

[Sprint 3: Oxtest Parser](./sprint-3-oxtest-parser.md)

---

**Last Updated**: November 13, 2025
