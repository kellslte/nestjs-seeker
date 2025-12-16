import { QueryParser } from '../../src/engine/query.parser';

describe('QueryParser', () => {
  let parser: QueryParser;

  beforeEach(() => {
    parser = new QueryParser('standard');
  });

  it('should be defined', () => {
    expect(parser).toBeDefined();
  });

  it('should parse query', () => {
    const result = parser.parse('hello world');
    expect(result).toEqual(['hello', 'world']);
  });

  it('should normalize text', () => {
    const result = parser.normalize('Hello, World!');
    expect(result).toBe('hello world');
  });

  it('should tokenize text', () => {
    const result = parser.tokenize('hello world test');
    expect(result).toEqual(['hello', 'world', 'test']);
  });

  it('should extract terms', () => {
    const result = parser.extractTerms('Hello, World!');
    expect(result).toEqual(['hello', 'world']);
  });

  it('should handle empty query', () => {
    const result = parser.parse('');
    expect(result).toEqual([]);
  });

  it('should handle whitespace analyzer', () => {
    const whitespaceParser = new QueryParser('whitespace');
    const result = whitespaceParser.tokenize('hello world');
    expect(result).toEqual(['hello', 'world']);
  });
});
