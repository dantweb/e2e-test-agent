import { chromium, Browser, BrowserContext, Page } from 'playwright';
import { HTMLExtractor } from '../../../../src/application/engines/HTMLExtractor';

describe('HTMLExtractor', () => {
  let browser: Browser;
  let context: BrowserContext;
  let page: Page;
  let extractor: HTMLExtractor;

  beforeAll(async () => {
    browser = await chromium.launch({ headless: true });
  });

  afterAll(async () => {
    await browser.close();
  });

  beforeEach(async () => {
    context = await browser.newContext();
    page = await context.newPage();
    extractor = new HTMLExtractor(page);
  });

  afterEach(async () => {
    await page.close();
    await context.close();
  });

  describe('Full HTML Extraction', () => {
    it('should extract full HTML', async () => {
      await page.setContent(`
        <html>
          <body>
            <h1>Welcome</h1>
            <form>
              <input name="username" />
              <button>Submit</button>
            </form>
          </body>
        </html>
      `);

      const html = await extractor.extractHTML();

      expect(html).toContain('<h1>Welcome</h1>');
      expect(html).toContain('<input name="username"');
      expect(html).toContain('<button>Submit</button>');
    });

    it('should extract body content', async () => {
      await page.setContent(`
        <html>
          <head><title>Test</title></head>
          <body>
            <div>Content</div>
          </body>
        </html>
      `);

      const html = await extractor.extractHTML();

      expect(html).toContain('<div>Content</div>');
    });
  });

  describe('Simplified HTML Extraction', () => {
    it('should extract simplified HTML without scripts', async () => {
      await page.setContent(`
        <html>
          <head>
            <script>console.log('test');</script>
          </head>
          <body>
            <div>Content</div>
            <script>alert('foo');</script>
          </body>
        </html>
      `);

      const html = await extractor.extractSimplified();

      expect(html).toContain('<div>Content</div>');
      expect(html).not.toContain('<script>');
      expect(html).not.toContain('console.log');
    });

    it('should extract simplified HTML without styles', async () => {
      await page.setContent(`
        <html>
          <head>
            <style>.test { color: red; }</style>
          </head>
          <body>
            <div>Content</div>
          </body>
        </html>
      `);

      const html = await extractor.extractSimplified();

      expect(html).toContain('<div>Content</div>');
      expect(html).not.toContain('<style>');
      expect(html).not.toContain('color: red');
    });

    it('should preserve data attributes', async () => {
      await page.setContent(`
        <button data-testid="submit-btn" class="btn">Submit</button>
      `);

      const html = await extractor.extractSimplified();

      expect(html).toContain('data-testid="submit-btn"');
      expect(html).toContain('Submit');
    });
  });

  describe('Visible Elements Extraction', () => {
    it('should extract only visible elements', async () => {
      await page.setContent(`
        <div>Visible</div>
        <div style="display:none">Hidden</div>
      `);

      const html = await extractor.extractVisible();

      expect(html).toContain('Visible');
      expect(html).not.toContain('Hidden');
    });

    it('should exclude visibility:hidden elements', async () => {
      await page.setContent(`
        <div>Visible</div>
        <div style="visibility:hidden">Hidden</div>
      `);

      const html = await extractor.extractVisible();

      expect(html).toContain('Visible');
      expect(html).not.toContain('Hidden');
    });

    it('should include nested visible elements', async () => {
      await page.setContent(`
        <div>
          <span>Parent</span>
          <div>
            <button>Nested</button>
          </div>
        </div>
      `);

      const html = await extractor.extractVisible();

      expect(html).toContain('Parent');
      expect(html).toContain('Nested');
    });
  });

  describe('Interactive Elements Extraction', () => {
    it('should extract interactive elements', async () => {
      await page.setContent(`
        <div>Static text</div>
        <button>Click me</button>
        <input type="text" placeholder="Enter text" />
        <a href="/link">Link</a>
        <select>
          <option>Option 1</option>
        </select>
      `);

      const html = await extractor.extractInteractive();

      expect(html).toContain('<button>Click me</button>');
      expect(html).toContain('<input');
      expect(html).toContain('<a href="/link">Link</a>');
      expect(html).toContain('<select>');
      expect(html).not.toContain('Static text');
    });

    it('should include form elements', async () => {
      await page.setContent(`
        <form>
          <input name="username" />
          <textarea name="message"></textarea>
          <button type="submit">Submit</button>
        </form>
      `);

      const html = await extractor.extractInteractive();

      expect(html).toContain('<form>');
      expect(html).toContain('<input name="username"');
      expect(html).toContain('<textarea');
      expect(html).toContain('<button');
    });
  });

  describe('Semantic Extraction', () => {
    it('should extract with semantic annotations', async () => {
      await page.setContent(`
        <button data-testid="submit-btn" class="btn primary">Submit</button>
        <input id="email" type="email" placeholder="Enter email" />
        <a href="/login" role="button">Login</a>
      `);

      const html = await extractor.extractSemantic();

      // Should include test IDs
      expect(html).toContain('data-testid="submit-btn"');
      // Should include IDs
      expect(html).toContain('id="email"');
      // Should include roles
      expect(html).toContain('role="button"');
      // Should include placeholders
      expect(html).toContain('placeholder="Enter email"');
    });

    it('should include ARIA labels', async () => {
      await page.setContent(`
        <button aria-label="Close dialog">X</button>
        <input aria-label="Search" type="search" />
      `);

      const html = await extractor.extractSemantic();

      expect(html).toContain('aria-label="Close dialog"');
      expect(html).toContain('aria-label="Search"');
    });
  });

  describe('Token-Limited Extraction', () => {
    it('should truncate long HTML', async () => {
      const longContent = '<div>' + 'a'.repeat(10000) + '</div>';
      await page.setContent(longContent);

      const html = await extractor.extractTruncated(1000);

      expect(html.length).toBeLessThanOrEqual(1100); // Some margin for tags
      expect(html).toContain('<div>');
    });

    it('should prioritize important elements when truncating', async () => {
      await page.setContent(`
        <div>${'a'.repeat(5000)}</div>
        <button id="important">Click</button>
        <div>${'b'.repeat(5000)}</div>
      `);

      const html = await extractor.extractTruncated(500);

      // Should include the button even if truncating
      expect(html).toContain('button');
    });
  });

  describe('Error Handling', () => {
    it('should handle empty page', async () => {
      await page.setContent('');

      const html = await extractor.extractHTML();

      expect(html).toBeDefined();
      expect(typeof html).toBe('string');
    });

    it('should handle malformed HTML', async () => {
      await page.setContent('<div><span>Unclosed');

      const html = await extractor.extractHTML();

      expect(html).toBeDefined();
      expect(html).toContain('Unclosed');
    });
  });
});
