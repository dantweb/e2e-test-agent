import {
  EnvironmentResolver,
  CircularReferenceError,
} from '../../../src/configuration/EnvironmentResolver';

describe('EnvironmentResolver', () => {
  let resolver: EnvironmentResolver;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    // Save original environment
    originalEnv = { ...process.env };
    // Clear test-related env vars
    delete process.env.TEST_VAR;
    delete process.env.BASE_URL;
    delete process.env.PORT;

    resolver = new EnvironmentResolver();
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('resolveString', () => {
    it('should resolve simple variable', () => {
      const result = resolver.resolveString('${BASE_URL}', { BASE_URL: 'https://example.com' });
      expect(result).toBe('https://example.com');
    });

    it('should resolve variable with default value', () => {
      const result = resolver.resolveString('${PORT:-8080}', {});
      expect(result).toBe('8080');
    });

    it('should use variable value over default', () => {
      const result = resolver.resolveString('${PORT:-8080}', { PORT: '3000' });
      expect(result).toBe('3000');
    });

    it('should resolve multiple variables in string', () => {
      const result = resolver.resolveString('${PROTO}://${HOST}:${PORT}', {
        PROTO: 'https',
        HOST: 'example.com',
        PORT: '443',
      });
      expect(result).toBe('https://example.com:443');
    });

    it('should leave non-variable text unchanged', () => {
      const result = resolver.resolveString('Hello World', {});
      expect(result).toBe('Hello World');
    });

    it('should handle variables at start, middle, and end', () => {
      const result = resolver.resolveString('${START} middle ${END}', {
        START: 'beginning',
        END: 'finish',
      });
      expect(result).toBe('beginning middle finish');
    });

    it('should use process.env when no envVars provided', () => {
      process.env.TEST_VAR = 'from-process';
      const result = resolver.resolveString('${TEST_VAR}');
      expect(result).toBe('from-process');
    });

    it('should prefer provided envVars over process.env', () => {
      process.env.TEST_VAR = 'from-process';
      const result = resolver.resolveString('${TEST_VAR}', { TEST_VAR: 'from-param' });
      expect(result).toBe('from-param');
    });

    it('should handle empty variable value', () => {
      const result = resolver.resolveString('${EMPTY}', { EMPTY: '' });
      expect(result).toBe('');
    });

    it('should warn on undefined variable without default', () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
      const result = resolver.resolveString('${UNDEFINED_VAR}', {});
      expect(result).toBe('${UNDEFINED_VAR}');
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Environment variable UNDEFINED_VAR')
      );
      warnSpy.mockRestore();
    });

    it('should handle special characters in values', () => {
      const result = resolver.resolveString('${SPECIAL}', {
        SPECIAL: 'value with spaces & symbols!',
      });
      expect(result).toBe('value with spaces & symbols!');
    });
  });

  describe('resolve', () => {
    it('should resolve variables in command params', () => {
      const config = {
        name: 'Test',
        subtasks: [
          {
            id: 'sub-1',
            description: 'Navigate',
            commands: [
              {
                type: 'navigate' as const,
                params: { url: '${BASE_URL}/login' },
              },
            ],
          },
        ],
        tasks: [],
      };

      const result = resolver.resolve(config, { BASE_URL: 'https://example.com' });

      expect(result.subtasks[0].commands[0].params?.url).toBe('https://example.com/login');
    });

    it('should resolve variables in selector values', () => {
      const config = {
        name: 'Test',
        subtasks: [
          {
            id: 'sub-1',
            description: 'Click',
            commands: [
              {
                type: 'click' as const,
                selector: { strategy: 'css' as const, value: '${BUTTON_SELECTOR}' },
              },
            ],
          },
        ],
        tasks: [],
      };

      const result = resolver.resolve(config, { BUTTON_SELECTOR: '.submit-btn' });

      expect(result.subtasks[0].commands[0].selector?.value).toBe('.submit-btn');
    });

    it('should use config env section', () => {
      const config = {
        name: 'Test',
        env: {
          BASE_URL: 'https://test.com',
        },
        subtasks: [
          {
            id: 'sub-1',
            description: 'Nav',
            commands: [
              {
                type: 'navigate' as const,
                params: { url: '${BASE_URL}' },
              },
            ],
          },
        ],
        tasks: [],
      };

      const result = resolver.resolve(config);

      expect(result.subtasks[0].commands[0].params?.url).toBe('https://test.com');
    });

    it('should respect precedence: provided > process.env > config.env > default', () => {
      process.env.TEST_VAR = 'from-process';

      const config = {
        name: 'Test',
        env: { TEST_VAR: 'from-config' },
        subtasks: [
          {
            id: 'sub-1',
            description: 'Test',
            commands: [
              {
                type: 'navigate' as const,
                params: { url: '${TEST_VAR}' },
              },
            ],
          },
        ],
        tasks: [],
      };

      const result = resolver.resolve(config, { TEST_VAR: 'from-provided' });

      expect(result.subtasks[0].commands[0].params?.url).toBe('from-provided');
    });

    it('should not mutate original config', () => {
      const config = {
        name: 'Test',
        subtasks: [
          {
            id: 'sub-1',
            description: 'Nav',
            commands: [
              {
                type: 'navigate' as const,
                params: { url: '${BASE_URL}' },
              },
            ],
          },
        ],
        tasks: [],
      };

      const originalUrl = config.subtasks[0].commands[0].params?.url;
      resolver.resolve(config, { BASE_URL: 'https://example.com' });

      expect(config.subtasks[0].commands[0].params?.url).toBe(originalUrl);
    });
  });

  describe('validateRequiredVars', () => {
    it('should return empty array when all variables are resolved', () => {
      const config = {
        name: 'Test',
        subtasks: [
          {
            id: 'sub-1',
            description: 'Nav',
            commands: [
              {
                type: 'navigate' as const,
                params: { url: '${BASE_URL}' },
              },
            ],
          },
        ],
        tasks: [],
      };

      const missing = resolver.validateRequiredVars(config, { BASE_URL: 'https://example.com' });

      expect(missing).toEqual([]);
    });

    it('should return missing variable names', () => {
      const config = {
        name: 'Test',
        subtasks: [
          {
            id: 'sub-1',
            description: 'Nav',
            commands: [
              {
                type: 'navigate' as const,
                params: { url: '${BASE_URL}/${API_PATH}' },
              },
            ],
          },
        ],
        tasks: [],
      };

      const missing = resolver.validateRequiredVars(config, {});

      expect(missing).toContain('BASE_URL');
      expect(missing).toContain('API_PATH');
      expect(missing).toHaveLength(2);
    });

    it('should not report variables with defaults as missing', () => {
      const config = {
        name: 'Test',
        subtasks: [
          {
            id: 'sub-1',
            description: 'Nav',
            commands: [
              {
                type: 'navigate' as const,
                params: { url: '${BASE_URL:-https://localhost}' },
              },
            ],
          },
        ],
        tasks: [],
      };

      const missing = resolver.validateRequiredVars(config, {});

      expect(missing).toEqual([]);
    });
  });

  describe('detectCircularReferences', () => {
    it('should detect simple circular reference', () => {
      expect(() => {
        resolver.resolveString('${VAR1}', { VAR1: '${VAR2}', VAR2: '${VAR1}' });
      }).toThrow(CircularReferenceError);
    });

    it('should detect multi-step circular reference', () => {
      expect(() => {
        resolver.resolveString('${VAR1}', {
          VAR1: '${VAR2}',
          VAR2: '${VAR3}',
          VAR3: '${VAR1}',
        });
      }).toThrow(CircularReferenceError);
    });

    it('should not throw on non-circular nested references', () => {
      const result = resolver.resolveString('${VAR1}', {
        VAR1: '${VAR2}/path',
        VAR2: 'https://example.com',
      });

      expect(result).toBe('https://example.com/path');
    });
  });
});
