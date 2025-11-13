import { ConfigValidator } from '../../../src/configuration/ConfigValidator';

describe('ConfigValidator', () => {
  let validator: ConfigValidator;

  beforeEach(() => {
    validator = new ConfigValidator();
  });

  describe('validate', () => {
    it('should validate correct configuration', () => {
      const config = {
        name: 'Test Suite',
        subtasks: [
          {
            id: 'sub-1',
            description: 'Navigate and assert',
            commands: [
              { type: 'navigate' as const, params: { url: 'https://example.com' } },
              {
                type: 'assertVisible' as const,
                selector: { strategy: 'css' as const, value: '.title' },
              },
            ],
          },
        ],
        tasks: [
          {
            id: 'task-1',
            description: 'Test',
            subtasks: ['sub-1'],
          },
        ],
      };

      const result = validator.validate(config);

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
      expect(result.warnings).toEqual([]);
    });

    it('should detect missing subtask reference', () => {
      const config = {
        name: 'Test Suite',
        subtasks: [],
        tasks: [
          {
            id: 'task-1',
            description: 'Test',
            subtasks: ['non-existent'],
          },
        ],
      };

      const result = validator.validate(config);

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          message: expect.stringContaining('non-existent'),
        })
      );
    });

    it('should detect duplicate subtask IDs', () => {
      const config = {
        name: 'Test Suite',
        subtasks: [
          {
            id: 'duplicate',
            description: 'First',
            commands: [{ type: 'navigate' as const, params: { url: 'https://example.com' } }],
          },
          {
            id: 'duplicate',
            description: 'Second',
            commands: [{ type: 'navigate' as const, params: { url: 'https://test.com' } }],
          },
        ],
        tasks: [],
      };

      const result = validator.validate(config);

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          message: expect.stringContaining('duplicate'),
        })
      );
    });

    it('should detect duplicate task IDs', () => {
      const config = {
        name: 'Test Suite',
        subtasks: [],
        tasks: [
          {
            id: 'duplicate',
            description: 'First',
            subtasks: [],
          },
          {
            id: 'duplicate',
            description: 'Second',
            subtasks: [],
          },
        ],
      };

      const result = validator.validate(config);

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          message: expect.stringContaining('duplicate'),
        })
      );
    });

    it('should warn if task has no subtasks', () => {
      const config = {
        name: 'Test Suite',
        subtasks: [],
        tasks: [
          {
            id: 'task-1',
            description: 'Empty task',
            subtasks: [],
          },
        ],
      };

      const result = validator.validate(config);

      expect(result.valid).toBe(true);
      expect(result.warnings).toContainEqual(
        expect.objectContaining({
          message: expect.stringContaining('no subtasks'),
        })
      );
    });

    it('should warn if subtask has no assertions', () => {
      const config = {
        name: 'Test Suite',
        subtasks: [
          {
            id: 'sub-1',
            description: 'Only actions',
            commands: [
              { type: 'navigate' as const, params: { url: 'https://example.com' } },
              {
                type: 'click' as const,
                selector: { strategy: 'css' as const, value: '.button' },
              },
            ],
          },
        ],
        tasks: [],
      };

      const result = validator.validate(config);

      expect(result.valid).toBe(true);
      expect(result.warnings).toContainEqual(
        expect.objectContaining({
          message: expect.stringContaining('no assertions'),
        })
      );
    });
  });

  describe('validateSubtaskReferences', () => {
    it('should return empty array for valid references', () => {
      const config = {
        name: 'Test',
        subtasks: [{ id: 'sub-1', description: 'Test', commands: [] }],
        tasks: [{ id: 'task-1', description: 'Test', subtasks: ['sub-1'] }],
      };

      const errors = validator.validateSubtaskReferences(config);

      expect(errors).toEqual([]);
    });

    it('should return errors for invalid references', () => {
      const config = {
        name: 'Test',
        subtasks: [],
        tasks: [{ id: 'task-1', description: 'Test', subtasks: ['missing-1', 'missing-2'] }],
      };

      const errors = validator.validateSubtaskReferences(config);

      expect(errors).toHaveLength(2);
      expect(errors[0]).toContain('missing-1');
      expect(errors[1]).toContain('missing-2');
    });
  });

  describe('validateCommandSelectors', () => {
    it('should validate interaction commands have selectors', () => {
      const config = {
        name: 'Test',
        subtasks: [
          {
            id: 'sub-1',
            description: 'Click',
            commands: [
              {
                type: 'click' as const,
                selector: { strategy: 'css' as const, value: '.button' },
              },
            ],
          },
        ],
        tasks: [],
      };

      const errors = validator.validateCommandSelectors(config);

      expect(errors).toEqual([]);
    });

    it('should detect missing selectors on interaction commands', () => {
      const config = {
        name: 'Test',
        subtasks: [
          {
            id: 'sub-1',
            description: 'Click without selector',
            commands: [
              {
                type: 'click' as const,
                // Missing selector
              },
            ],
          },
        ],
        tasks: [],
      };

      const errors = validator.validateCommandSelectors(config);

      expect(errors).toHaveLength(1);
      expect(errors[0]).toContain('click');
      expect(errors[0]).toContain('selector');
    });
  });

  describe('convertToDomainEntities', () => {
    it('should convert YAML config to domain entities', () => {
      const config = {
        name: 'Test Suite',
        subtasks: [
          {
            id: 'sub-1',
            description: 'Navigate',
            commands: [
              {
                type: 'navigate' as const,
                params: { url: 'https://example.com' },
              },
            ],
          },
        ],
        tasks: [
          {
            id: 'task-1',
            description: 'Test task',
            subtasks: ['sub-1'],
          },
        ],
      };

      const result = validator.convertToDomainEntities(config);

      expect(result.subtasks.size).toBe(1);
      expect(result.tasks.size).toBe(1);

      const subtask = result.subtasks.get('sub-1');
      expect(subtask).toBeDefined();
      expect(subtask!.id).toBe('sub-1');
      expect(subtask!.commands).toHaveLength(1);

      const task = result.tasks.get('task-1');
      expect(task).toBeDefined();
      expect(task!.id).toBe('task-1');
      expect(task!.subtasks).toContain('sub-1');
    });

    it('should convert selectors correctly', () => {
      const config = {
        name: 'Test Suite',
        subtasks: [
          {
            id: 'sub-1',
            description: 'Click',
            commands: [
              {
                type: 'click' as const,
                selector: {
                  strategy: 'css' as const,
                  value: '.button',
                  fallbacks: [{ strategy: 'text' as const, value: 'Submit' }],
                },
              },
            ],
          },
        ],
        tasks: [],
      };

      const result = validator.convertToDomainEntities(config);

      const subtask = result.subtasks.get('sub-1');
      const command = subtask!.commands[0];

      expect(command.selector).toBeDefined();
      expect(command.selector!.strategy).toBe('css');
      expect(command.selector!.value).toBe('.button');
      expect(command.selector!.fallbacks).toHaveLength(1);
    });

    it('should convert task setup and teardown commands', () => {
      const config = {
        name: 'Test Suite',
        subtasks: [],
        tasks: [
          {
            id: 'task-1',
            description: 'Task with setup/teardown',
            subtasks: [],
            setup: [{ type: 'navigate' as const, params: { url: 'https://example.com' } }],
            teardown: [{ type: 'screenshot' as const, params: { name: 'final' } }],
          },
        ],
      };

      const result = validator.convertToDomainEntities(config);

      const task = result.tasks.get('task-1');
      expect(task!.setup).toHaveLength(1);
      expect(task!.teardown).toHaveLength(1);
    });
  });
});
