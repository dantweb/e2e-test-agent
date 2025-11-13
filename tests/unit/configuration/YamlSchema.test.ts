import {
  SelectorSpecSchema,
  OxtestCommandSchema,
  SubtaskSchema,
  TaskSchema,
  TestSuiteSchema,
  parseTestSuite,
} from '../../../src/configuration/YamlSchema';

describe('YamlSchema', () => {
  describe('SelectorSpecSchema', () => {
    it('should validate a basic selector spec', () => {
      const data = {
        strategy: 'css',
        value: '.submit-button',
      };

      const result = SelectorSpecSchema.parse(data);
      expect(result.strategy).toBe('css');
      expect(result.value).toBe('.submit-button');
    });

    it('should validate a selector spec with fallbacks', () => {
      const data = {
        strategy: 'css',
        value: '.button',
        fallbacks: [
          { strategy: 'text', value: 'Submit' },
          { strategy: 'role', value: 'button' },
        ],
      };

      const result = SelectorSpecSchema.parse(data);
      expect(result.fallbacks).toHaveLength(2);
      expect(result.fallbacks?.[0].strategy).toBe('text');
    });

    it('should reject invalid strategy', () => {
      const data = {
        strategy: 'invalid',
        value: '.button',
      };

      expect(() => SelectorSpecSchema.parse(data)).toThrow();
    });

    it('should reject empty value', () => {
      const data = {
        strategy: 'css',
        value: '',
      };

      expect(() => SelectorSpecSchema.parse(data)).toThrow();
    });
  });

  describe('OxtestCommandSchema', () => {
    it('should validate a navigate command', () => {
      const data = {
        type: 'navigate',
        params: { url: 'https://example.com' },
      };

      const result = OxtestCommandSchema.parse(data);
      expect(result.type).toBe('navigate');
      expect(result.params?.url).toBe('https://example.com');
    });

    it('should validate a click command with selector', () => {
      const data = {
        type: 'click',
        selector: { strategy: 'css', value: '.button' },
      };

      const result = OxtestCommandSchema.parse(data);
      expect(result.type).toBe('click');
      expect(result.selector?.strategy).toBe('css');
    });

    it('should validate a fill command', () => {
      const data = {
        type: 'fill',
        selector: { strategy: 'css', value: '#input' },
        params: { value: 'test data' },
      };

      const result = OxtestCommandSchema.parse(data);
      expect(result.type).toBe('fill');
      expect(result.params?.value).toBe('test data');
    });

    it('should reject invalid command type', () => {
      const data = {
        type: 'invalidCommand',
      };

      expect(() => OxtestCommandSchema.parse(data)).toThrow();
    });
  });

  describe('SubtaskSchema', () => {
    it('should validate a subtask with commands', () => {
      const data = {
        id: 'sub-1',
        description: 'Click the button',
        commands: [
          {
            type: 'click',
            selector: { strategy: 'css', value: '.button' },
          },
        ],
      };

      const result = SubtaskSchema.parse(data);
      expect(result.id).toBe('sub-1');
      expect(result.description).toBe('Click the button');
      expect(result.commands).toHaveLength(1);
    });

    it('should reject subtask without commands', () => {
      const data = {
        id: 'sub-1',
        description: 'No commands',
        commands: [],
      };

      expect(() => SubtaskSchema.parse(data)).toThrow();
    });

    it('should reject subtask without id', () => {
      const data = {
        description: 'No ID',
        commands: [{ type: 'navigate', params: { url: 'https://example.com' } }],
      };

      expect(() => SubtaskSchema.parse(data)).toThrow();
    });
  });

  describe('TaskSchema', () => {
    it('should validate a simple task', () => {
      const data = {
        id: 'task-1',
        description: 'Test login',
        subtasks: [],
      };

      const result = TaskSchema.parse(data);
      expect(result.id).toBe('task-1');
      expect(result.description).toBe('Test login');
      expect(result.subtasks).toEqual([]);
    });

    it('should validate a task with subtask references', () => {
      const data = {
        id: 'task-1',
        description: 'Complex test',
        subtasks: ['sub-1', 'sub-2'],
      };

      const result = TaskSchema.parse(data);
      expect(result.subtasks).toHaveLength(2);
      expect(result.subtasks[0]).toBe('sub-1');
    });

    it('should validate a task with setup and teardown', () => {
      const data = {
        id: 'task-1',
        description: 'Test with setup',
        subtasks: [],
        setup: [{ type: 'navigate', params: { url: 'https://example.com' } }],
        teardown: [{ type: 'screenshot', params: { name: 'final' } }],
      };

      const result = TaskSchema.parse(data);
      expect(result.setup).toHaveLength(1);
      expect(result.teardown).toHaveLength(1);
    });
  });

  describe('TestSuiteSchema', () => {
    it('should validate a complete test suite', () => {
      const data = {
        name: 'Login Tests',
        subtasks: [
          {
            id: 'sub-1',
            description: 'Navigate to login',
            commands: [{ type: 'navigate', params: { url: 'https://example.com/login' } }],
          },
        ],
        tasks: [
          {
            id: 'task-1',
            description: 'Test login flow',
            subtasks: ['sub-1'],
          },
        ],
      };

      const result = TestSuiteSchema.parse(data);
      expect(result.name).toBe('Login Tests');
      expect(result.subtasks).toHaveLength(1);
      expect(result.tasks).toHaveLength(1);
    });

    it('should validate test suite with environment variables', () => {
      const data = {
        name: 'API Tests',
        env: {
          BASE_URL: 'https://api.example.com',
          API_KEY: 'test-key',
        },
        subtasks: [],
        tasks: [],
      };

      const result = TestSuiteSchema.parse(data);
      expect(result.env).toBeDefined();
      expect(result.env?.BASE_URL).toBe('https://api.example.com');
    });
  });

  describe('parseTestSuite', () => {
    it('should parse valid test suite YAML', () => {
      const data = {
        name: 'Test Suite',
        subtasks: [],
        tasks: [],
      };

      const result = parseTestSuite(data);
      expect(result.name).toBe('Test Suite');
    });

    it('should throw on invalid data', () => {
      const data = {
        // Missing required fields
        invalid: 'data',
      };

      expect(() => parseTestSuite(data)).toThrow();
    });
  });
});
