/**
 * Unit tests for ExistsValidation
 * Sprint 16: Validation Predicates to Domain
 *
 * Tests element existence validation
 */

import { ExistsValidation } from '../../../../src/domain/validation/ExistsValidation';
import { ValidationType } from '../../../../src/domain/enums/ValidationType';
import type { ValidationContext } from '../../../../src/domain/interfaces/ValidationPredicate';
import { Page } from 'playwright';

describe('ExistsValidation', () => {
  let mockPage: jest.Mocked<Page>;
  let context: ValidationContext;

  beforeEach(() => {
    // Create mock locator with count method
    const mockLocator = {
      first: jest.fn().mockReturnThis(),
      count: jest.fn(),
    };

    mockPage = {
      locator: jest.fn().mockReturnValue(mockLocator),
    } as any;

    context = {
      page: mockPage,
    };
  });

  describe('constructor', () => {
    it('should create validation with selector', () => {
      const validation = new ExistsValidation('.button');

      expect(validation.type).toBe(ValidationType.Exists);
      expect(validation.params.selector).toBe('.button');
      expect(validation.description).toContain('.button');
    });

    it('should create validation with custom description', () => {
      const validation = new ExistsValidation('.button', 'Submit button exists');

      expect(validation.description).toBe('Submit button exists');
    });

    it('should use default description if not provided', () => {
      const validation = new ExistsValidation('.button');

      expect(validation.description).toBe('Element .button should exist');
    });
  });

  describe('evaluate', () => {
    it('should pass when element exists', async () => {
      const validation = new ExistsValidation('.button');
      const mockLocator = mockPage.locator('.button').first();
      (mockLocator.count as jest.Mock).mockResolvedValue(1);

      const result = await validation.evaluate(context);

      expect(result.passed).toBe(true);
      expect(result.message).toContain('exists');
      expect(result.actualValue).toBe(1);
      expect(result.expectedValue).toBe('at least 1');
    });

    it('should fail when element does not exist', async () => {
      const validation = new ExistsValidation('.button');
      const mockLocator = mockPage.locator('.button').first();
      (mockLocator.count as jest.Mock).mockResolvedValue(0);

      const result = await validation.evaluate(context);

      expect(result.passed).toBe(false);
      expect(result.message).toContain('not found');
      expect(result.actualValue).toBe(0);
    });

    it('should pass when multiple elements exist', async () => {
      const validation = new ExistsValidation('.item');
      const mockLocator = mockPage.locator('.item').first();
      (mockLocator.count as jest.Mock).mockResolvedValue(5);

      const result = await validation.evaluate(context);

      expect(result.passed).toBe(true);
      expect(result.actualValue).toBe(5);
    });

    it('should handle errors gracefully', async () => {
      const validation = new ExistsValidation('.button');
      const mockLocator = mockPage.locator('.button').first();
      (mockLocator.count as jest.Mock).mockRejectedValue(new Error('Locator timeout'));

      const result = await validation.evaluate(context);

      expect(result.passed).toBe(false);
      expect(result.message).toContain('Error checking existence');
      expect(result.message).toContain('Locator timeout');
    });

    it('should work with complex selectors', async () => {
      const validation = new ExistsValidation('button[data-testid="submit"]');
      const mockLocator = mockPage.locator('button[data-testid="submit"]').first();
      (mockLocator.count as jest.Mock).mockResolvedValue(1);

      const result = await validation.evaluate(context);

      expect(result.passed).toBe(true);
      expect(mockPage.locator).toHaveBeenCalledWith('button[data-testid="submit"]');
    });
  });

  describe('toString', () => {
    it('should return string representation', () => {
      const validation = new ExistsValidation('.button');

      expect(validation.toString()).toBe('Exists(.button)');
    });

    it('should work with complex selectors', () => {
      const validation = new ExistsValidation('div > button.primary');

      expect(validation.toString()).toBe('Exists(div > button.primary)');
    });
  });

  describe('params', () => {
    it('should expose selector as readonly', () => {
      const validation = new ExistsValidation('.button');

      expect(validation.params.selector).toBe('.button');
      expect(() => {
        (validation.params as any).selector = '.other';
      }).toThrow();
    });
  });
});
