import { YamlParser, YamlParseError } from '../../../src/configuration/YamlParser';
import * as fs from 'fs';

// Mock fs module
jest.mock('fs');
const mockFs = fs as jest.Mocked<typeof fs>;

describe('YamlParser', () => {
  let parser: YamlParser;

  beforeEach(() => {
    parser = new YamlParser();
    jest.clearAllMocks();
  });

  describe('parseString', () => {
    it('should parse valid YAML string', () => {
      const yamlString = `
name: Test Suite
subtasks:
  - id: sub-1
    description: Test subtask
    commands:
      - type: navigate
        params:
          url: https://example.com
tasks:
  - id: task-1
    description: Test task
    subtasks:
      - sub-1
`;

      const result = parser.parseString(yamlString);

      expect(result.name).toBe('Test Suite');
      expect(result.subtasks).toHaveLength(1);
      expect(result.tasks).toHaveLength(1);
      expect(result.subtasks[0].id).toBe('sub-1');
    });

    it('should reject malformed YAML', () => {
      const malformedYaml = `
name: Test
  invalid: indentation
    more: bad
`;

      expect(() => parser.parseString(malformedYaml)).toThrow(YamlParseError);
    });

    it('should reject invalid schema', () => {
      const invalidSchema = `
name: Test Suite
# Missing required fields
`;

      expect(() => parser.parseString(invalidSchema)).toThrow(YamlParseError);
    });

    it('should include error context in exception', () => {
      const invalidYaml = 'name: Test\ninvalid: [unclosed';

      try {
        parser.parseString(invalidYaml);
        fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(YamlParseError);
        const yamlError = error as YamlParseError;
        expect(yamlError.message).toContain('Failed to parse YAML');
      }
    });
  });

  describe('parseFile', () => {
    const testFilePath = '/test/path/test.yaml';

    it('should parse valid YAML file', () => {
      const validYaml = `
name: Test Suite
subtasks: []
tasks: []
`;
      mockFs.readFileSync.mockReturnValue(validYaml);

      const result = parser.parseFile(testFilePath);

      expect(mockFs.readFileSync).toHaveBeenCalledWith(testFilePath, 'utf-8');
      expect(result.name).toBe('Test Suite');
    });

    it('should handle file not found', () => {
      mockFs.readFileSync.mockImplementation(() => {
        const error = new Error('ENOENT: no such file or directory') as NodeJS.ErrnoException;
        error.code = 'ENOENT';
        throw error;
      });

      expect(() => parser.parseFile(testFilePath)).toThrow(YamlParseError);
      expect(() => parser.parseFile(testFilePath)).toThrow(/File not found/);
    });

    it('should handle permission errors', () => {
      mockFs.readFileSync.mockImplementation(() => {
        const error = new Error('EACCES: permission denied') as NodeJS.ErrnoException;
        error.code = 'EACCES';
        throw error;
      });

      expect(() => parser.parseFile(testFilePath)).toThrow(YamlParseError);
      expect(() => parser.parseFile(testFilePath)).toThrow(/Permission denied/);
    });

    it('should support .yml extension', () => {
      const ymlFilePath = '/test/path/test.yml';
      const validYaml = 'name: Test\nsubtasks: []\ntasks: []';
      mockFs.readFileSync.mockReturnValue(validYaml);

      const result = parser.parseFile(ymlFilePath);

      expect(result.name).toBe('Test');
    });
  });

  describe('validateFile', () => {
    const testFilePath = '/test/path/test.yaml';

    it('should return valid result for correct file', () => {
      const validYaml = `
name: Test Suite
subtasks: []
tasks: []
`;
      mockFs.readFileSync.mockReturnValue(validYaml);

      const result = parser.validateFile(testFilePath);

      expect(result.valid).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.name).toBe('Test Suite');
      expect(result.errors).toBeUndefined();
    });

    it('should return invalid result for incorrect file', () => {
      const invalidYaml = 'name: Test\n# Missing required fields';
      mockFs.readFileSync.mockReturnValue(invalidYaml);

      const result = parser.validateFile(testFilePath);

      expect(result.valid).toBe(false);
      expect(result.data).toBeUndefined();
      expect(result.errors).toBeDefined();
      expect(result.errors!.length).toBeGreaterThan(0);
    });

    it('should handle file read errors gracefully', () => {
      mockFs.readFileSync.mockImplementation(() => {
        const error = new Error('ENOENT') as NodeJS.ErrnoException;
        error.code = 'ENOENT';
        throw error;
      });

      const result = parser.validateFile(testFilePath);

      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors![0]).toContain('File not found');
    });
  });

  describe('error messages', () => {
    it('should provide helpful error for schema validation failure', () => {
      const invalidYaml = `
name: Test Suite
subtasks:
  - id: sub-1
    description: Test
    commands: []
tasks: []
`;

      try {
        parser.parseString(invalidYaml);
        fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(YamlParseError);
        const yamlError = error as YamlParseError;
        expect(yamlError.message).toContain('Validation failed');
      }
    });
  });
});
