import {
  createReporter,
  getAllReporters,
  JSONReporter,
  ConsoleReporter,
  JUnitReporter,
  HTMLReporter,
} from '../../../../src/presentation/reporters';

describe('Reporters Index', () => {
  describe('createReporter', () => {
    it('should create JSONReporter for "json"', () => {
      const reporter = createReporter('json');

      expect(reporter).toBeInstanceOf(JSONReporter);
      expect(reporter.name).toBe('JSON');
      expect(reporter.fileExtension).toBe('json');
    });

    it('should create ConsoleReporter for "console"', () => {
      const reporter = createReporter('console');

      expect(reporter).toBeInstanceOf(ConsoleReporter);
      expect(reporter.name).toBe('Console');
      expect(reporter.fileExtension).toBe('txt');
    });

    it('should create JUnitReporter for "junit"', () => {
      const reporter = createReporter('junit');

      expect(reporter).toBeInstanceOf(JUnitReporter);
      expect(reporter.name).toBe('JUnit');
      expect(reporter.fileExtension).toBe('xml');
    });

    it('should create JUnitReporter for "xml" alias', () => {
      const reporter = createReporter('xml');

      expect(reporter).toBeInstanceOf(JUnitReporter);
      expect(reporter.name).toBe('JUnit');
    });

    it('should create HTMLReporter for "html"', () => {
      const reporter = createReporter('html');

      expect(reporter).toBeInstanceOf(HTMLReporter);
      expect(reporter.name).toBe('HTML');
      expect(reporter.fileExtension).toBe('html');
    });

    it('should be case-insensitive', () => {
      const reporters = [
        createReporter('JSON'),
        createReporter('CONSOLE'),
        createReporter('JUNIT'),
        createReporter('HTML'),
        createReporter('Xml'),
      ];

      expect(reporters[0]).toBeInstanceOf(JSONReporter);
      expect(reporters[1]).toBeInstanceOf(ConsoleReporter);
      expect(reporters[2]).toBeInstanceOf(JUnitReporter);
      expect(reporters[3]).toBeInstanceOf(HTMLReporter);
      expect(reporters[4]).toBeInstanceOf(JUnitReporter);
    });

    it('should throw error for unknown reporter', () => {
      expect(() => createReporter('unknown')).toThrow(
        'Unknown reporter: unknown. Available reporters: json, console, junit, html',
      );
    });

    it('should throw error for empty string', () => {
      expect(() => createReporter('')).toThrow('Unknown reporter:');
    });

    it('should throw error for invalid reporter name', () => {
      expect(() => createReporter('pdf')).toThrow('Unknown reporter: pdf');
    });
  });

  describe('getAllReporters', () => {
    it('should return all 4 reporters', () => {
      const reporters = getAllReporters();

      expect(reporters).toHaveLength(4);
    });

    it('should return JSONReporter first', () => {
      const reporters = getAllReporters();

      expect(reporters[0]).toBeInstanceOf(JSONReporter);
    });

    it('should return ConsoleReporter second', () => {
      const reporters = getAllReporters();

      expect(reporters[1]).toBeInstanceOf(ConsoleReporter);
    });

    it('should return JUnitReporter third', () => {
      const reporters = getAllReporters();

      expect(reporters[2]).toBeInstanceOf(JUnitReporter);
    });

    it('should return HTMLReporter fourth', () => {
      const reporters = getAllReporters();

      expect(reporters[3]).toBeInstanceOf(HTMLReporter);
    });

    it('should return new instances each time', () => {
      const reporters1 = getAllReporters();
      const reporters2 = getAllReporters();

      expect(reporters1[0]).not.toBe(reporters2[0]);
      expect(reporters1[1]).not.toBe(reporters2[1]);
      expect(reporters1[2]).not.toBe(reporters2[2]);
      expect(reporters1[3]).not.toBe(reporters2[3]);
    });

    it('should return reporters with correct names', () => {
      const reporters = getAllReporters();

      expect(reporters[0].name).toBe('JSON');
      expect(reporters[1].name).toBe('Console');
      expect(reporters[2].name).toBe('JUnit');
      expect(reporters[3].name).toBe('HTML');
    });

    it('should return reporters with correct file extensions', () => {
      const reporters = getAllReporters();

      expect(reporters[0].fileExtension).toBe('json');
      expect(reporters[1].fileExtension).toBe('txt');
      expect(reporters[2].fileExtension).toBe('xml');
      expect(reporters[3].fileExtension).toBe('html');
    });
  });

  describe('exports', () => {
    it('should export all reporter classes', () => {
      expect(JSONReporter).toBeDefined();
      expect(ConsoleReporter).toBeDefined();
      expect(JUnitReporter).toBeDefined();
      expect(HTMLReporter).toBeDefined();
    });

    it('should export factory functions', () => {
      expect(typeof createReporter).toBe('function');
      expect(typeof getAllReporters).toBe('function');
    });
  });
});
