import * as fs from 'fs/promises';
import { OxtestCommand } from '../../domain/entities/OxtestCommand';
import { OxtestTokenizer } from './OxtestTokenizer';
import { OxtestCommandParser } from './OxtestCommandParser';

/**
 * Parses complete .ox.test files into arrays of OxtestCommand entities.
 *
 * Combines tokenization and command parsing to process entire files,
 * handling comments, empty lines, and providing helpful error messages
 * with line numbers.
 */
export class OxtestParser {
  private readonly tokenizer: OxtestTokenizer;
  private readonly commandParser: OxtestCommandParser;

  constructor() {
    this.tokenizer = new OxtestTokenizer();
    this.commandParser = new OxtestCommandParser();
  }

  /**
   * Parses an .ox.test file from the filesystem.
   *
   * @param filePath Path to the .ox.test file
   * @returns Array of parsed OxtestCommand entities
   * @throws Error if file cannot be read or parsing fails
   */
  public async parseFile(filePath: string): Promise<readonly OxtestCommand[]> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      return this.parseContent(content);
    } catch (error) {
      const err = error as NodeJS.ErrnoException;
      if (err.code === 'ENOENT') {
        throw new Error(`File not found: ${filePath}`);
      } else if (err.code === 'EACCES') {
        throw new Error(`Permission denied: ${filePath}`);
      }
      throw new Error(`Failed to read file ${filePath}: ${err.message}`);
    }
  }

  /**
   * Parses Oxtest content from a string.
   *
   * @param content The Oxtest file content
   * @returns Array of parsed OxtestCommand entities
   * @throws Error if parsing fails (with line numbers)
   */
  public parseContent(content: string): readonly OxtestCommand[] {
    const lines = content.split('\n');
    const commands: OxtestCommand[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNumber = i + 1;

      try {
        const tokens = this.tokenizer.tokenize(line);

        // Skip empty lines and comments
        if (tokens.length === 0) {
          continue;
        }

        const command = this.commandParser.parse(tokens, lineNumber);
        commands.push(command);
      } catch (error) {
        const err = error as Error;
        // Check if error already has line number
        if (err.message.includes(`Line ${lineNumber}`)) {
          throw err;
        }
        throw new Error(`Line ${lineNumber}: ${err.message}`);
      }
    }

    return Object.freeze(commands);
  }
}
