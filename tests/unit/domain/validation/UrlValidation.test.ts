/**
 * Unit tests for UrlValidation
 * Sprint 16: Validation Predicates to Domain
 *
 * Tests URL pattern validation
 */

import { UrlValidation } from '../../../../src/domain/validation/UrlValidation';
import { ValidationType } from '../../../../src/domain/enums/ValidationType';
import type { ValidationContext } from '../../../../src/domain/interfaces/ValidationPredicate';
import { Page } from 'playwright';

describe('UrlValidation', () => {
  let mockPage: jest.Mocked<Page>;
  let context: ValidationContext;

  beforeEach(() => {
    mockPage = {
      url: jest.fn(),
    } as any;

    context = {
      page: mockPage,
    };
  });

  describe('constructor', () => {
    it('should create validation with pattern', () => {
      const validation = new UrlValidation('/checkout');

      expect(validation.type).toBe(ValidationType.Url);
      expect(validation.params.pattern).toBe('/checkout');
    });

    it('should create validation with custom description', () => {
      const validation = new UrlValidation('/checkout', 'User is on checkout page');

      expect(validation.description).toBe('User is on checkout page');
    });

    it('should use default description if not provided', () => {
      const validation = new UrlValidation('/checkout');

      expect(validation.description).toBe('URL should match pattern "/checkout"');
    });
  });

  describe('evaluate', () => {
    it('should pass when URL contains pattern', async () => {
      const validation = new UrlValidation('/checkout');
      (mockPage.url as jest.Mock).mockReturnValue('https://example.com/checkout');

      const result = await validation.evaluate(context);

      expect(result.passed).toBe(true);
      expect(result.message).toContain('matches');
      expect(result.actualValue).toBe('https://example.com/checkout');
      expect(result.expectedValue).toBe('/checkout');
    });

    it('should pass when URL matches regex pattern', async () => {
      const validation = new UrlValidation('/product/\\d+');
      (mockPage.url as jest.Mock).mockReturnValue('https://example.com/product/123');

      const result = await validation.evaluate(context);

      expect(result.passed).toBe(true);
    });

    it('should fail when URL does not match pattern', async () => {
      const validation = new UrlValidation('/checkout');
      (mockPage.url as jest.Mock).mockReturnValue('https://example.com/cart');

      const result = await validation.evaluate(context);

      expect(result.passed).toBe(false);
      expect(result.message).toContain('does not match');
      expect(result.actualValue).toBe('https://example.com/cart');
    });

    it('should handle regex special characters', async () => {
      const validation = new UrlValidation('\\?query=test');
      (mockPage.url as jest.Mock).mockReturnValue('https://example.com/search?query=test');

      const result = await validation.evaluate(context);

      expect(result.passed).toBe(true);
    });

    it('should handle errors gracefully', async () => {
      const validation = new UrlValidation('/checkout');
      (mockPage.url as jest.Mock).mockImplementation(() => {
        throw new Error('Page closed');
      });

      const result = await validation.evaluate(context);

      expect(result.passed).toBe(false);
      expect(result.message).toContain('Error checking URL');
      expect(result.message).toContain('Page closed');
    });

    it('should work with full URL pattern', async () => {
      const validation = new UrlValidation('https://example.com/checkout');
      (mockPage.url as jest.Mock).mockReturnValue('https://example.com/checkout');

      const result = await validation.evaluate(context);

      expect(result.passed).toBe(true);
    });

    it('should handle query parameters', async () => {
      const validation = new UrlValidation('step=payment');
      (mockPage.url as jest.Mock).mockReturnValue('https://example.com/checkout?step=payment');

      const result = await validation.evaluate(context);

      expect(result.passed).toBe(true);
    });
  });

  describe('toString', () => {
    it('should return string representation', () => {
      const validation = new UrlValidation('/checkout');

      expect(validation.toString()).toBe('Url("/checkout")');
    });
  });
});
