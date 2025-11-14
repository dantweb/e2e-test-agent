/**
 * Unit tests for VisibleValidation
 * Sprint 16: Validation Predicates to Domain
 *
 * Tests element visibility validation
 */

import { VisibleValidation } from '../../../../src/domain/validation/VisibleValidation';
import { ValidationType } from '../../../../src/domain/enums/ValidationType';
import type { ValidationContext } from '../../../../src/domain/interfaces/ValidationPredicate';
import { Page } from 'playwright';

describe('VisibleValidation', () => {
  let mockPage: jest.Mocked<Page>;
  let context: ValidationContext;

  beforeEach(() => {
    const mockLocator = {
      first: jest.fn().mockReturnThis(),
      isVisible: jest.fn(),
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
      const validation = new VisibleValidation('.modal');

      expect(validation.type).toBe(ValidationType.Visible);
      expect(validation.params.selector).toBe('.modal');
      expect(validation.description).toContain('.modal');
    });

    it('should create validation with custom description', () => {
      const validation = new VisibleValidation('.modal', 'Modal is visible');

      expect(validation.description).toBe('Modal is visible');
    });
  });

  describe('evaluate', () => {
    it('should pass when element is visible', async () => {
      const validation = new VisibleValidation('.modal');
      const mockLocator = mockPage.locator('.modal').first();
      (mockLocator.isVisible as jest.Mock).mockResolvedValue(true);

      const result = await validation.evaluate(context);

      expect(result.passed).toBe(true);
      expect(result.message).toContain('visible');
      expect(result.actualValue).toBe(true);
      expect(result.expectedValue).toBe(true);
    });

    it('should fail when element is not visible', async () => {
      const validation = new VisibleValidation('.modal');
      const mockLocator = mockPage.locator('.modal').first();
      (mockLocator.isVisible as jest.Mock).mockResolvedValue(false);

      const result = await validation.evaluate(context);

      expect(result.passed).toBe(false);
      expect(result.message).toContain('not visible');
      expect(result.actualValue).toBe(false);
    });

    it('should handle errors gracefully', async () => {
      const validation = new VisibleValidation('.modal');
      const mockLocator = mockPage.locator('.modal').first();
      (mockLocator.isVisible as jest.Mock).mockRejectedValue(new Error('Element not found'));

      const result = await validation.evaluate(context);

      expect(result.passed).toBe(false);
      expect(result.message).toContain('Error checking visibility');
      expect(result.message).toContain('Element not found');
    });
  });

  describe('toString', () => {
    it('should return string representation', () => {
      const validation = new VisibleValidation('.modal');

      expect(validation.toString()).toBe('Visible(.modal)');
    });
  });
});
