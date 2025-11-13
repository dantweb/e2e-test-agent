import { ExecutionContextManager } from '../../../../src/application/orchestrators/ExecutionContextManager';

describe('ExecutionContextManager', () => {
  let manager: ExecutionContextManager;

  beforeEach(() => {
    manager = new ExecutionContextManager();
  });

  describe('Initialization', () => {
    it('should initialize empty context', () => {
      const context = manager.getContext();

      expect(context.variables).toEqual({});
      expect(context.cookies).toEqual([]);
      expect(context.sessionId).toBeDefined();
      expect(context.sessionId).toMatch(/^session-/);
    });

    it('should generate unique session IDs', () => {
      const manager1 = new ExecutionContextManager();
      const manager2 = new ExecutionContextManager();

      expect(manager1.getContext().sessionId).not.toBe(
        manager2.getContext().sessionId
      );
    });
  });

  describe('Variable Management', () => {
    it('should set variable', () => {
      manager.setVariable('username', 'admin');
      const context = manager.getContext();

      expect(context.variables.username).toBe('admin');
    });

    it('should get variable', () => {
      manager.setVariable('url', 'https://shop.dev');
      const value = manager.getVariable('url');

      expect(value).toBe('https://shop.dev');
    });

    it('should return undefined for non-existent variable', () => {
      const value = manager.getVariable('nonexistent');

      expect(value).toBeUndefined();
    });

    it('should update existing variable', () => {
      manager.setVariable('count', '1');
      manager.setVariable('count', '2');

      expect(manager.getVariable('count')).toBe('2');
    });

    it('should handle multiple variables', () => {
      manager.setVariable('a', '1');
      manager.setVariable('b', '2');
      manager.setVariable('c', '3');

      expect(manager.getVariable('a')).toBe('1');
      expect(manager.getVariable('b')).toBe('2');
      expect(manager.getVariable('c')).toBe('3');
    });

    it('should not mutate original context when setting variable', () => {
      const original = manager.getContext();
      manager.setVariable('test', 'value');

      expect(original.variables).toEqual({});
    });
  });

  describe('Cookie Management', () => {
    it('should update cookies', () => {
      const cookies = [
        { name: 'session', value: 'abc123', domain: '.shop.dev', path: '/' },
      ];

      manager.updateCookies(cookies);
      const context = manager.getContext();

      expect(context.cookies).toHaveLength(1);
      expect(context.cookies[0].name).toBe('session');
      expect(context.cookies[0].value).toBe('abc123');
    });

    it('should replace existing cookies', () => {
      const cookies1 = [
        { name: 'session', value: 'old', domain: '.shop.dev', path: '/' },
      ];
      const cookies2 = [
        { name: 'session', value: 'new', domain: '.shop.dev', path: '/' },
      ];

      manager.updateCookies(cookies1);
      manager.updateCookies(cookies2);

      const context = manager.getContext();
      expect(context.cookies).toHaveLength(1);
      expect(context.cookies[0].value).toBe('new');
    });

    it('should handle multiple cookies', () => {
      const cookies = [
        { name: 'session', value: 'abc', domain: '.shop.dev', path: '/' },
        { name: 'user', value: 'john', domain: '.shop.dev', path: '/' },
        { name: 'token', value: 'xyz', domain: '.shop.dev', path: '/' },
      ];

      manager.updateCookies(cookies);

      expect(manager.getContext().cookies).toHaveLength(3);
    });

    it('should handle empty cookie array', () => {
      manager.updateCookies([]);

      expect(manager.getContext().cookies).toEqual([]);
    });
  });

  describe('URL and Page Title', () => {
    it('should set current URL', () => {
      manager.setCurrentUrl('https://shop.dev/products');

      expect(manager.getContext().currentUrl).toBe('https://shop.dev/products');
    });

    it('should set page title', () => {
      manager.setPageTitle('Product Catalog');

      expect(manager.getContext().pageTitle).toBe('Product Catalog');
    });

    it('should update URL and title together', () => {
      manager.setCurrentUrl('https://shop.dev/cart');
      manager.setPageTitle('Shopping Cart');

      const context = manager.getContext();
      expect(context.currentUrl).toBe('https://shop.dev/cart');
      expect(context.pageTitle).toBe('Shopping Cart');
    });
  });

  describe('Context Cloning', () => {
    it('should clone context', () => {
      manager.setVariable('test', 'value');
      manager.setCurrentUrl('https://shop.dev');
      const clone = manager.clone();

      clone.setVariable('test', 'modified');

      expect(manager.getVariable('test')).toBe('value');
      expect(clone.getVariable('test')).toBe('modified');
    });

    it('should clone with independent sessionId', () => {
      const clone = manager.clone();

      expect(clone.getContext().sessionId).toBe(manager.getContext().sessionId);
    });

    it('should clone cookies independently', () => {
      const cookies = [
        { name: 'session', value: 'abc', domain: '.shop.dev', path: '/' },
      ];
      manager.updateCookies(cookies);

      const clone = manager.clone();
      const newCookies = [
        { name: 'user', value: 'john', domain: '.shop.dev', path: '/' },
      ];
      clone.updateCookies(newCookies);

      expect(manager.getContext().cookies).toHaveLength(1);
      expect(clone.getContext().cookies).toHaveLength(1);
      expect(manager.getContext().cookies[0].name).toBe('session');
      expect(clone.getContext().cookies[0].name).toBe('user');
    });
  });

  describe('Context Merging', () => {
    it('should merge context', () => {
      manager.setVariable('a', '1');

      const other = new ExecutionContextManager();
      other.setVariable('b', '2');

      manager.merge(other.getContext());

      expect(manager.getVariable('a')).toBe('1');
      expect(manager.getVariable('b')).toBe('2');
    });

    it('should override variables on merge', () => {
      manager.setVariable('key', 'original');

      const other = new ExecutionContextManager();
      other.setVariable('key', 'updated');

      manager.merge(other.getContext());

      expect(manager.getVariable('key')).toBe('updated');
    });

    it('should append cookies on merge', () => {
      const cookies1 = [
        { name: 'session', value: 'abc', domain: '.shop.dev', path: '/' },
      ];
      const cookies2 = [
        { name: 'user', value: 'john', domain: '.shop.dev', path: '/' },
      ];

      manager.updateCookies(cookies1);

      const other = new ExecutionContextManager();
      other.updateCookies(cookies2);

      manager.merge(other.getContext());

      expect(manager.getContext().cookies).toHaveLength(2);
    });

    it('should preserve session ID on merge', () => {
      const originalSessionId = manager.getContext().sessionId;

      const other = new ExecutionContextManager();
      manager.merge(other.getContext());

      expect(manager.getContext().sessionId).toBe(originalSessionId);
    });
  });

  describe('Metadata', () => {
    it('should set metadata', () => {
      manager.setMetadata('testRun', 'run-123');

      expect(manager.getContext().metadata?.testRun).toBe('run-123');
    });

    it('should handle multiple metadata entries', () => {
      manager.setMetadata('key1', 'value1');
      manager.setMetadata('key2', 123);
      manager.setMetadata('key3', { nested: true });

      const metadata = manager.getContext().metadata;
      expect(metadata?.key1).toBe('value1');
      expect(metadata?.key2).toBe(123);
      expect(metadata?.key3).toEqual({ nested: true });
    });
  });

  describe('Context Reset', () => {
    it('should reset context', () => {
      manager.setVariable('test', 'value');
      manager.setCurrentUrl('https://shop.dev');
      manager.updateCookies([
        { name: 'session', value: 'abc', domain: '.shop.dev', path: '/' },
      ]);

      manager.reset();

      const context = manager.getContext();
      expect(context.variables).toEqual({});
      expect(context.cookies).toEqual([]);
      expect(context.currentUrl).toBeUndefined();
      expect(context.pageTitle).toBeUndefined();
    });

    it('should preserve session ID on reset', () => {
      const originalSessionId = manager.getContext().sessionId;

      manager.setVariable('test', 'value');
      manager.reset();

      expect(manager.getContext().sessionId).toBe(originalSessionId);
    });
  });
});
