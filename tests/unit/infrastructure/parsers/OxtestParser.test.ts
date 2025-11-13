import { OxtestParser } from '../../../../src/infrastructure/parsers/OxtestParser';
import * as fs from 'fs/promises';

jest.mock('fs/promises');
const mockFs = fs as jest.Mocked<typeof fs>;

describe('OxtestParser', () => {
  let parser: OxtestParser;

  beforeEach(() => {
    parser = new OxtestParser();
    jest.clearAllMocks();
  });

  describe('parseContent', () => {
    it('should parse complete oxtest content', () => {
      const oxtest = `
# Login test
navigate url=https://shop.dev
fill css=input[name="username"] value=admin
fill css=input[type="password"] value=secret
click text=Login
wait timeout=2000
assertVisible css=.dashboard
`;

      const commands = parser.parseContent(oxtest);

      expect(commands).toHaveLength(6);
      expect(commands[0].type).toBe('navigate');
      expect(commands[5].type).toBe('assertVisible');
    });

    it('should skip comments and empty lines', () => {
      const oxtest = `
# Comment
navigate url=https://example.com

# Another comment

click css=button
`;

      const commands = parser.parseContent(oxtest);

      expect(commands).toHaveLength(2);
      expect(commands[0].type).toBe('navigate');
      expect(commands[1].type).toBe('click');
    });

    it('should handle empty content', () => {
      const commands = parser.parseContent('');
      expect(commands).toEqual([]);
    });

    it('should handle content with only comments', () => {
      const oxtest = `
# Comment 1
# Comment 2
# Comment 3
`;

      const commands = parser.parseContent(oxtest);
      expect(commands).toEqual([]);
    });

    it('should throw on parse error with line number', () => {
      const oxtest = `
navigate url=https://shop.dev
invalid_command css=button
click css=button.submit
`;

      expect(() => parser.parseContent(oxtest)).toThrow(/Line 3.*Unknown command.*invalid_command/);
    });

    it('should return frozen array', () => {
      const oxtest = 'navigate url=https://example.com';
      const commands = parser.parseContent(oxtest);

      expect(Object.isFrozen(commands)).toBe(true);
    });
  });

  describe('parseFile', () => {
    it('should parse file from filesystem', async () => {
      const content = 'navigate url=https://example.com\nclick css=button';
      mockFs.readFile.mockResolvedValue(content);

      const commands = await parser.parseFile('./test.ox.test');

      expect(mockFs.readFile).toHaveBeenCalledWith('./test.ox.test', 'utf-8');
      expect(commands).toHaveLength(2);
    });

    it('should throw on file not found', async () => {
      const error = new Error('ENOENT') as NodeJS.ErrnoException;
      error.code = 'ENOENT';
      mockFs.readFile.mockRejectedValue(error);

      await expect(parser.parseFile('./missing.ox.test')).rejects.toThrow(
        'File not found: ./missing.ox.test'
      );
    });

    it('should throw on permission denied', async () => {
      const error = new Error('EACCES') as NodeJS.ErrnoException;
      error.code = 'EACCES';
      mockFs.readFile.mockRejectedValue(error);

      await expect(parser.parseFile('./test.ox.test')).rejects.toThrow('Permission denied');
    });
  });
});
