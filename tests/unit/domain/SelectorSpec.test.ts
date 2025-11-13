import { SelectorSpec } from '../../../src/domain/entities/SelectorSpec';
import { SelectorStrategy } from '../../../src/domain/enums/SelectorStrategy';

describe('SelectorSpec', () => {
  describe('constructor', () => {
    it('should create a SelectorSpec with required fields', () => {
      const spec = new SelectorSpec('css', '.submit-button');

      expect(spec.strategy).toBe('css');
      expect(spec.value).toBe('.submit-button');
      expect(spec.fallbacks).toEqual([]);
      expect(spec.metadata).toBeUndefined();
    });

    it('should create a SelectorSpec with fallback strategies', () => {
      const fallbacks = [
        { strategy: 'text' as SelectorStrategy, value: 'Submit' },
        { strategy: 'role' as SelectorStrategy, value: 'button' },
      ];
      const spec = new SelectorSpec('css', '.submit-button', fallbacks);

      expect(spec.strategy).toBe('css');
      expect(spec.value).toBe('.submit-button');
      expect(spec.fallbacks).toHaveLength(2);
      expect(spec.fallbacks[0].strategy).toBe('text');
      expect(spec.fallbacks[0].value).toBe('Submit');
    });

    it('should create a SelectorSpec with metadata', () => {
      const metadata = { confidence: 0.95, source: 'llm-generated' };
      const spec = new SelectorSpec('css', '.submit-button', [], metadata);

      expect(spec.metadata).toEqual(metadata);
      expect(spec.metadata?.confidence).toBe(0.95);
      expect(spec.metadata?.source).toBe('llm-generated');
    });
  });

  describe('validation', () => {
    it('should reject empty strategy', () => {
      expect(() => new SelectorSpec('' as SelectorStrategy, '.button')).toThrow(
        'Strategy cannot be empty'
      );
    });

    it('should reject empty value', () => {
      expect(() => new SelectorSpec('css', '')).toThrow('Value cannot be empty');
    });

    it('should reject invalid strategy', () => {
      expect(() => new SelectorSpec('invalid' as SelectorStrategy, '.button')).toThrow(
        'Invalid selector strategy'
      );
    });
  });

  describe('toPlaywrightSelector', () => {
    it('should convert CSS selector to Playwright format', () => {
      const spec = new SelectorSpec('css', '.submit-button');
      expect(spec.toPlaywrightSelector()).toBe('.submit-button');
    });

    it('should convert text selector to Playwright format', () => {
      const spec = new SelectorSpec('text', 'Submit');
      expect(spec.toPlaywrightSelector()).toBe('text=Submit');
    });

    it('should convert role selector to Playwright format', () => {
      const spec = new SelectorSpec('role', 'button');
      expect(spec.toPlaywrightSelector()).toBe('role=button');
    });

    it('should convert xpath selector to Playwright format', () => {
      const spec = new SelectorSpec('xpath', '//button[@type="submit"]');
      expect(spec.toPlaywrightSelector()).toBe('xpath=//button[@type="submit"]');
    });

    it('should convert data-testid selector to Playwright format', () => {
      const spec = new SelectorSpec('testid', 'submit-btn');
      expect(spec.toPlaywrightSelector()).toBe('[data-testid="submit-btn"]');
    });
  });

  describe('equals', () => {
    it('should return true for identical selectors', () => {
      const spec1 = new SelectorSpec('css', '.button');
      const spec2 = new SelectorSpec('css', '.button');
      expect(spec1.equals(spec2)).toBe(true);
    });

    it('should return false for different strategies', () => {
      const spec1 = new SelectorSpec('css', '.button');
      const spec2 = new SelectorSpec('text', '.button');
      expect(spec1.equals(spec2)).toBe(false);
    });

    it('should return false for different values', () => {
      const spec1 = new SelectorSpec('css', '.button');
      const spec2 = new SelectorSpec('css', '.submit');
      expect(spec1.equals(spec2)).toBe(false);
    });
  });

  describe('clone', () => {
    it('should create a deep copy of the selector', () => {
      const fallbacks = [{ strategy: 'text' as SelectorStrategy, value: 'Submit' }];
      const spec = new SelectorSpec('css', '.button', fallbacks, { confidence: 0.9 });
      const clone = spec.clone();

      expect(clone).not.toBe(spec);
      expect(clone.equals(spec)).toBe(true);
      expect(clone.fallbacks).not.toBe(spec.fallbacks);
      expect(clone.fallbacks).toEqual(spec.fallbacks);
      expect(clone.metadata).toEqual(spec.metadata);
    });
  });
});
