import { LanguageDetectionService } from '../../../src/application/services/LanguageDetectionService';

describe('LanguageDetectionService', () => {
  let service: LanguageDetectionService;

  beforeEach(() => {
    service = new LanguageDetectionService();
  });

  describe('detectLanguage', () => {
    it('should detect German from html lang attribute', () => {
      const html = '<html lang="de"><body>Inhalt</body></html>';
      expect(service.detectLanguage(html)).toEqual({
        code: 'de',
        name: 'German',
      });
    });

    it('should detect English from html lang attribute', () => {
      const html = '<html lang="en"><body>Content</body></html>';
      expect(service.detectLanguage(html)).toEqual({
        code: 'en',
        name: 'English',
      });
    });

    it('should detect German from content-language meta tag', () => {
      const html = '<html><head><meta http-equiv="content-language" content="de"></head></html>';
      expect(service.detectLanguage(html)).toEqual({
        code: 'de',
        name: 'German',
      });
    });

    it('should fall back to English if no language detected', () => {
      const html = '<html><body>Content</body></html>';
      expect(service.detectLanguage(html)).toEqual({
        code: 'en',
        name: 'English',
      });
    });

    it('should handle language codes with region (de-DE)', () => {
      const html = '<html lang="de-DE"><body>Inhalt</body></html>';
      expect(service.detectLanguage(html)).toEqual({
        code: 'de',
        name: 'German',
      });
    });

    it('should handle language codes with region (en-US)', () => {
      const html = '<html lang="en-US"><body>Content</body></html>';
      expect(service.detectLanguage(html)).toEqual({
        code: 'en',
        name: 'English',
      });
    });

    it('should detect French from html lang attribute', () => {
      const html = '<html lang="fr"><body>Contenu</body></html>';
      expect(service.detectLanguage(html)).toEqual({
        code: 'fr',
        name: 'French',
      });
    });

    it('should detect Spanish from html lang attribute', () => {
      const html = '<html lang="es"><body>Contenido</body></html>';
      expect(service.detectLanguage(html)).toEqual({
        code: 'es',
        name: 'Spanish',
      });
    });

    it('should handle uppercase language codes', () => {
      const html = '<html lang="DE"><body>Inhalt</body></html>';
      expect(service.detectLanguage(html)).toEqual({
        code: 'de',
        name: 'German',
      });
    });
  });

  describe('getLanguageContext', () => {
    it('should return empty context for English language', () => {
      const context = service.getLanguageContext({ code: 'en', name: 'English' });
      expect(context).toBe('');
    });

    it('should return German context for German language', () => {
      const context = service.getLanguageContext({ code: 'de', name: 'German' });
      expect(context).toContain('website is in German');
      expect(context).toContain('German text for selectors');
    });

    it('should include common UI element translations for German', () => {
      const context = service.getLanguageContext({ code: 'de', name: 'German' });
      expect(context).toContain('Login');
      expect(context).toContain('Anmelden');
      expect(context).toContain('Add to Cart');
      expect(context).toContain('In den Warenkorb');
      expect(context).toContain('Checkout');
      expect(context).toContain('Zur Kasse');
    });

    it('should include warning about NOT using English for German sites', () => {
      const context = service.getLanguageContext({ code: 'de', name: 'German' });
      expect(context).toContain('Do NOT use English');
      expect(context.toLowerCase()).toContain('must');
    });

    it('should return context for French language', () => {
      const context = service.getLanguageContext({ code: 'fr', name: 'French' });
      expect(context).toContain('website is in French');
      expect(context).toContain('French text for selectors');
    });

    it('should return generic context for unsupported languages', () => {
      const context = service.getLanguageContext({ code: 'it', name: 'Italian' });
      expect(context).toContain('website is in Italian');
      expect(context).toContain('Italian text for selectors');
    });
  });
});
