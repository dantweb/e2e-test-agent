import { PredicateValidationEngine } from '../../../../src/application/orchestrators/PredicateValidationEngine';
import {
  PlaywrightExecutor,
  ExecutionResult,
} from '../../../../src/infrastructure/executors/PlaywrightExecutor';
import { SelectorSpec } from '../../../../src/domain/entities/SelectorSpec';

describe('PredicateValidationEngine', () => {
  let engine: PredicateValidationEngine;
  let mockExecutor: jest.Mocked<PlaywrightExecutor>;

  beforeEach(() => {
    // Create mock executor
    mockExecutor = {
      execute: jest.fn(),
      initialize: jest.fn(),
      close: jest.fn(),
      getPage: jest.fn(),
    } as any;

    engine = new PredicateValidationEngine(mockExecutor);
  });

  describe('validate - exists predicate', () => {
    it('should validate exists predicate successfully', async () => {
      const mockResult: ExecutionResult = {
        success: true,
        duration: 100,
      };
      mockExecutor.execute.mockResolvedValue(mockResult);

      const selector = new SelectorSpec('css', '.success-message');
      const result = await engine.validateExists(selector, 'Success message exists');

      expect(result.passed).toBe(true);
      expect(result.description).toBe('Success message exists');
      expect(mockExecutor.execute).toHaveBeenCalledTimes(1);

      const calledCommand = mockExecutor.execute.mock.calls[0][0];
      expect(calledCommand.type).toBe('assertVisible');
    });

    it('should fail exists predicate when element not found', async () => {
      const mockResult: ExecutionResult = {
        success: false,
        error: 'Element not found',
        duration: 100,
      };
      mockExecutor.execute.mockResolvedValue(mockResult);

      const selector = new SelectorSpec('css', '.missing-element');
      const result = await engine.validateExists(selector, 'Missing element');

      expect(result.passed).toBe(false);
      expect(result.error).toBe('Element not found');
    });

    it('should handle executor exception', async () => {
      mockExecutor.execute.mockRejectedValue(new Error('Browser crashed'));

      const selector = new SelectorSpec('css', '.element');
      const result = await engine.validateExists(selector, 'Element check');

      expect(result.passed).toBe(false);
      expect(result.error).toContain('Browser crashed');
    });
  });

  describe('validate - not_exists predicate', () => {
    it('should validate not_exists predicate successfully', async () => {
      const mockResult: ExecutionResult = {
        success: true,
        duration: 100,
      };
      mockExecutor.execute.mockResolvedValue(mockResult);

      const selector = new SelectorSpec('css', '.error-message');
      const result = await engine.validateNotExists(selector, 'Error message not present');

      expect(result.passed).toBe(true);
      expect(result.description).toBe('Error message not present');

      const calledCommand = mockExecutor.execute.mock.calls[0][0];
      expect(calledCommand.type).toBe('assertHidden');
    });

    it('should fail not_exists when element is present', async () => {
      const mockResult: ExecutionResult = {
        success: false,
        error: 'Element exists but should not',
        duration: 100,
      };
      mockExecutor.execute.mockResolvedValue(mockResult);

      const selector = new SelectorSpec('css', '.error');
      const result = await engine.validateNotExists(selector, 'Error check');

      expect(result.passed).toBe(false);
      expect(result.error).toContain('should not');
    });
  });

  describe('validate - visible predicate', () => {
    it('should validate visible predicate successfully', async () => {
      const mockResult: ExecutionResult = {
        success: true,
        duration: 100,
      };
      mockExecutor.execute.mockResolvedValue(mockResult);

      const selector = new SelectorSpec('css', '.modal');
      const result = await engine.validateVisible(selector, 'Modal is visible');

      expect(result.passed).toBe(true);

      const calledCommand = mockExecutor.execute.mock.calls[0][0];
      expect(calledCommand.type).toBe('assertVisible');
    });

    it('should fail visible when element hidden', async () => {
      const mockResult: ExecutionResult = {
        success: false,
        error: 'Element is not visible',
        duration: 100,
      };
      mockExecutor.execute.mockResolvedValue(mockResult);

      const selector = new SelectorSpec('css', '.hidden-div');
      const result = await engine.validateVisible(selector, 'Visibility check');

      expect(result.passed).toBe(false);
    });
  });

  describe('validate - text predicate', () => {
    it('should validate text predicate successfully', async () => {
      const mockResult: ExecutionResult = {
        success: true,
        duration: 100,
      };
      mockExecutor.execute.mockResolvedValue(mockResult);

      const selector = new SelectorSpec('css', '.title');
      const result = await engine.validateText(selector, 'Welcome', 'Title text check');

      expect(result.passed).toBe(true);

      const calledCommand = mockExecutor.execute.mock.calls[0][0];
      expect(calledCommand.type).toBe('assertText');
      expect(calledCommand.params.expected).toBe('Welcome');
    });

    it('should fail text when value does not match', async () => {
      const mockResult: ExecutionResult = {
        success: false,
        error: 'Text does not match',
        duration: 100,
      };
      mockExecutor.execute.mockResolvedValue(mockResult);

      const selector = new SelectorSpec('css', '.message');
      const result = await engine.validateText(selector, 'Hello', 'Text check');

      expect(result.passed).toBe(false);
    });
  });

  describe('validate - value predicate', () => {
    it('should validate value predicate successfully', async () => {
      const mockResult: ExecutionResult = {
        success: true,
        duration: 100,
      };
      mockExecutor.execute.mockResolvedValue(mockResult);

      const selector = new SelectorSpec('css', 'input[name="username"]');
      const result = await engine.validateValue(selector, 'admin', 'Input value check');

      expect(result.passed).toBe(true);

      const calledCommand = mockExecutor.execute.mock.calls[0][0];
      expect(calledCommand.type).toBe('assertValue');
      expect(calledCommand.params.expected).toBe('admin');
    });

    it('should fail value when input value differs', async () => {
      const mockResult: ExecutionResult = {
        success: false,
        error: 'Value mismatch',
        duration: 100,
      };
      mockExecutor.execute.mockResolvedValue(mockResult);

      const selector = new SelectorSpec('css', 'input');
      const result = await engine.validateValue(selector, 'expected', 'Value check');

      expect(result.passed).toBe(false);
    });
  });

  describe('validate - url predicate', () => {
    it('should validate url pattern successfully', async () => {
      const mockResult: ExecutionResult = {
        success: true,
        duration: 100,
      };
      mockExecutor.execute.mockResolvedValue(mockResult);

      const result = await engine.validateUrl('.*/home', 'URL contains /home');

      expect(result.passed).toBe(true);

      const calledCommand = mockExecutor.execute.mock.calls[0][0];
      expect(calledCommand.type).toBe('assertUrl');
      expect(calledCommand.params.pattern).toBe('.*/home');
    });

    it('should fail url when pattern does not match', async () => {
      const mockResult: ExecutionResult = {
        success: false,
        error: 'URL pattern does not match',
        duration: 100,
      };
      mockExecutor.execute.mockResolvedValue(mockResult);

      const result = await engine.validateUrl('.*/dashboard', 'URL check');

      expect(result.passed).toBe(false);
    });
  });

  describe('validateAll', () => {
    it('should validate all validations successfully', async () => {
      mockExecutor.execute.mockResolvedValue({
        success: true,
        duration: 100,
      });

      const results = await engine.validateAll([
        { type: 'exists', selector: new SelectorSpec('css', '.a'), description: 'A exists' },
        {
          type: 'not_exists',
          selector: new SelectorSpec('css', '.b'),
          description: 'B not exists',
        },
        { type: 'url', pattern: '.*/page', description: 'URL check' },
      ]);

      expect(results).toHaveLength(3);
      expect(results.every(r => r.passed)).toBe(true);
      expect(mockExecutor.execute).toHaveBeenCalledTimes(3);
    });

    it('should return mixed results when some fail', async () => {
      mockExecutor.execute
        .mockResolvedValueOnce({ success: true, duration: 100 })
        .mockResolvedValueOnce({ success: false, error: 'Failed', duration: 100 })
        .mockResolvedValueOnce({ success: true, duration: 100 });

      const results = await engine.validateAll([
        { type: 'exists', selector: new SelectorSpec('css', '.a'), description: 'A' },
        { type: 'visible', selector: new SelectorSpec('css', '.b'), description: 'B' },
        {
          type: 'text',
          selector: new SelectorSpec('css', '.c'),
          expected: 'text',
          description: 'C',
        },
      ]);

      expect(results).toHaveLength(3);
      expect(results[0].passed).toBe(true);
      expect(results[1].passed).toBe(false);
      expect(results[2].passed).toBe(true);
    });

    it('should handle empty validation list', async () => {
      const results = await engine.validateAll([]);

      expect(results).toHaveLength(0);
      expect(mockExecutor.execute).not.toHaveBeenCalled();
    });

    it('should continue validating after one fails', async () => {
      mockExecutor.execute
        .mockResolvedValueOnce({ success: false, error: 'Failed', duration: 100 })
        .mockResolvedValueOnce({ success: true, duration: 100 });

      const results = await engine.validateAll([
        { type: 'exists', selector: new SelectorSpec('css', '.a'), description: 'A' },
        { type: 'exists', selector: new SelectorSpec('css', '.b'), description: 'B' },
      ]);

      expect(results).toHaveLength(2);
      expect(mockExecutor.execute).toHaveBeenCalledTimes(2);
    });
  });

  describe('edge cases', () => {
    it('should handle unknown validation type gracefully', async () => {
      const result = await engine.validateAll([
        { type: 'unknown_type' as any, description: 'Unknown' },
      ]);

      expect(result).toHaveLength(1);
      expect(result[0].passed).toBe(false);
      expect(result[0].error).toContain('Unknown validation type');
    });

    it('should handle missing expected values', async () => {
      mockExecutor.execute.mockResolvedValue({ success: true, duration: 100 });

      const selector = new SelectorSpec('css', '.element');
      const result = await engine.validateText(selector, '', 'Empty text check');

      expect(result.passed).toBe(true);

      const calledCommand = mockExecutor.execute.mock.calls[0][0];
      expect(calledCommand.params.expected).toBe('');
    });

    it('should handle concurrent validations', async () => {
      mockExecutor.execute.mockResolvedValue({ success: true, duration: 100 });

      const validations = Array.from({ length: 10 }, (_, i) => ({
        type: 'exists' as const,
        selector: new SelectorSpec('css', `.element-${i}`),
        description: `Element ${i}`,
      }));

      const results = await engine.validateAll(validations);

      expect(results).toHaveLength(10);
      expect(mockExecutor.execute).toHaveBeenCalledTimes(10);
    });
  });
});
