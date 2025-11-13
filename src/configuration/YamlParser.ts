import * as fs from 'fs';
import * as yaml from 'yaml';
import { ZodError } from 'zod';
import { parseTestSuite, TestSuiteYaml } from './YamlSchema';

/**
 * Custom error class for YAML parsing errors.
 */
export class YamlParseError extends Error {
  constructor(
    message: string,
    public readonly filePath?: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'YamlParseError';
    Object.setPrototypeOf(this, YamlParseError.prototype);
  }
}

/**
 * Result of file validation.
 */
export interface ValidationResult {
  valid: boolean;
  data?: TestSuiteYaml;
  errors?: string[];
}

/**
 * Parser for YAML test suite configuration files.
 * Handles file reading, YAML parsing, and schema validation.
 */
export class YamlParser {
  /**
   * Parses a YAML string and validates against schema.
   * @throws {YamlParseError} If parsing or validation fails
   */
  public parseString(yamlString: string): TestSuiteYaml {
    try {
      // Parse YAML string
      const data = yaml.parse(yamlString);

      // Validate against schema
      try {
        return parseTestSuite(data);
      } catch (error) {
        if (error instanceof ZodError) {
          const errorMessages = error.issues.map(
            issue => `${issue.path.join('.')}: ${issue.message}`
          );
          throw new YamlParseError(
            `Validation failed:\n${errorMessages.join('\n')}`,
            undefined,
            error
          );
        }
        throw error;
      }
    } catch (error) {
      if (error instanceof YamlParseError) {
        throw error;
      }

      // YAML parsing error
      throw new YamlParseError(
        `Failed to parse YAML: ${(error as Error).message}`,
        undefined,
        error as Error
      );
    }
  }

  /**
   * Parses a YAML file and validates against schema.
   * @throws {YamlParseError} If file cannot be read or parsed
   */
  public parseFile(filePath: string): TestSuiteYaml {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      return this.parseString(content);
    } catch (error) {
      if (error instanceof YamlParseError) {
        // Re-throw with file path context
        throw new YamlParseError(error.message, filePath, error.cause);
      }

      // File system error
      const fsError = error as NodeJS.ErrnoException;
      if (fsError.code === 'ENOENT') {
        throw new YamlParseError(`File not found: ${filePath}`, filePath, fsError);
      } else if (fsError.code === 'EACCES') {
        throw new YamlParseError(`Permission denied: ${filePath}`, filePath, fsError);
      } else {
        throw new YamlParseError(
          `Failed to read file: ${fsError.message}`,
          filePath,
          fsError
        );
      }
    }
  }

  /**
   * Validates a YAML file without throwing exceptions.
   * Returns a result object with validation status.
   */
  public validateFile(filePath: string): ValidationResult {
    try {
      const data = this.parseFile(filePath);
      return {
        valid: true,
        data,
      };
    } catch (error) {
      const yamlError = error as YamlParseError;
      return {
        valid: false,
        errors: [yamlError.message],
      };
    }
  }
}
