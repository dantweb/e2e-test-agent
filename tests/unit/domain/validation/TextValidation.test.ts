/**
 * Unit tests for TextValidation
 * Sprint 16: Validation Predicates to Domain
 *
 * Tests text content validation
 */

import { TextValidation } from '../../../../src/domain/validation/TextValidation';
import { ValidationType } from '../../../../src/domain/enums/ValidationType';
import type { ValidationContext } from '../../../../src/domain/interfaces/ValidationPredicate';
import { Page } from 'playwright';

describe('TextValidation', () => {
  let mockPage: jest.Mocked<Page>;
  let context: ValidationContext;

  beforeEach(() => {
    const mockLocator = {
      first: jest.fn().mockReturnThis(),
      textContent: jest.fn(),
    };

    mockPage = {
      locator: jest.fn().mockReturnValue(mockLocator),
    } as any;

    context = {
      page: mockPage,
    };
  });

  describe('constructor', () => {
    it('should create validation with selector and expected text', () => {
      const validation = new TextValidation('.title', 'Welcome');

      expect(validation.type).toBe(ValidationType.Text);
      expect(validation.params.selector).toBe('.title');
      expect(validation.params.expected).toBe('Welcome');
    });

    it('should create validation with custom description', () => {
      const validation = new TextValidation('.title', 'Welcome', 'Title shows welcome message');

      expect(validation.description).toBe('Title shows welcome message');
    });

    it('should use default description if not provided', () => {
      const validation = new TextValidation('.title', 'Welcome');

      expect(validation.description).toBe('Element .title should contain text "Welcome"');
    });
  });

  describe('evaluate', () => {
    it('should pass when text matches exactly', async () => {
      const validation = new TextValidation('.title', 'Welcome');
      const mockLocator = mockPage.locator('.title').first();
      (mockLocator.textContent as jest.Mock).mockResolvedValue('Welcome');

      const result = await validation.evaluate(context);

      expect(result.passed).toBe(true);
      expect(result.message).toContain('matches');
      expect(result.actualValue).toBe('Welcome');
      expect(result.expectedValue).toBe('Welcome');
    });

    it('should pass when text contains expected substring', async () => {
      const validation = new TextValidation('.title', 'Welcome');
      const mockLocator = mockPage.locator('.title').first();
      (mockLocator.textContent as jest.Mock).mockResolvedValue('Welcome to our site');

      const result = await validation.evaluate(context);

      expect(result.passed).toBe(true);
      expect(result.actualValue).toBe('Welcome to our site');
    });

    it('should fail when text does not match', async () => {
      const validation = new TextValidation('.title', 'Welcome');
      const mockLocator = mockPage.locator('.title').first();
      (mockLocator.textContent as jest.Mock).mockResolvedValue('Hello');

      const result = await validation.evaluate(context);

      expect(result.passed).toBe(false);
      expect(result.message).toContain('does not contain');
      expect(result.actualValue).toBe('Hello');
      expect(result.expectedValue).toBe('Welcome');
    });

    it('should be case-sensitive by default', async () => {
      const validation = new TextValidation('.title', 'Welcome');
      const mockLocator = mockPage.locator('.title').first();
      (mockLocator.textContent as jest.Mock).mockResolvedValue('welcome');

      const result = await validation.evaluate(context);

      expect(result.passed).toBe(false);
    });

    it('should handle null text content', async () => {
      const validation = new TextValidation('.title', 'Welcome');
      const mockLocator = mockPage.locator('.title').first();
      (mockLocator.textContent as jest.Mock).mockResolvedValue(null);

      const result = await validation.evaluate(context);

      expect(result.passed).toBe(false);
      expect(result.actualValue).toBe('');
    });

    it('should trim whitespace from actual text', async () => {
      const validation = new TextValidation('.title', 'Welcome');
      const mockLocator = mockPage.locator('.title').first();
      (mockLocator.textContent as jest.Mock).mockResolvedValue('  Welcome  ');

      const result = await validation.evaluate(context);

      expect(result.passed).toBe(true);
      expect(result.actualValue).toBe('Welcome');
    });

    it('should handle errors gracefully', async () => {
      const validation = new TextValidation('.title', 'Welcome');
      const mockLocator = mockPage.locator('.title').first();
      (mockLocator.textContent as jest.Mock).mockRejectedValue(new Error('Element not found'));

      const result = await validation.evaluate(context);

      expect(result.passed).toBe(false);
      expect(result.message).toContain('Error checking text');
    });
  });

  describe('toString', () => {
    it('should return string representation', () => {
      const validation = new TextValidation('.title', 'Welcome');

      expect(validation.toString()).toBe('Text(.title, "Welcome")');
    });
  });
});
