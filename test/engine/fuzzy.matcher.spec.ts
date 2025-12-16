import { FuzzyMatcher } from '../../src/engine/fuzzy.matcher';

describe('FuzzyMatcher', () => {
  let matcher: FuzzyMatcher;

  beforeEach(() => {
    matcher = new FuzzyMatcher(2);
  });

  it('should be defined', () => {
    expect(matcher).toBeDefined();
  });

  it('should calculate Levenshtein distance', () => {
    expect(matcher.levenshteinDistance('kitten', 'sitting')).toBe(3);
    expect(matcher.levenshteinDistance('hello', 'hello')).toBe(0);
    expect(matcher.levenshteinDistance('', 'hello')).toBe(5);
  });

  it('should match exact strings', () => {
    expect(matcher.isMatch('hello', 'hello')).toBe(true);
  });

  it('should match similar strings within threshold', () => {
    expect(matcher.isMatch('hello', 'hallo')).toBe(true);
    expect(matcher.isMatch('hello', 'helo')).toBe(true);
  });

  it('should not match strings beyond threshold', () => {
    expect(matcher.isMatch('hello', 'world')).toBe(false);
  });

  it('should find matches in array', () => {
    const terms = ['hello', 'world', 'test', 'hallo'];
    const matches = matcher.findMatches(terms, 'hello');
    expect(matches).toContain('hello');
    expect(matches).toContain('hallo');
  });

  it('should calculate similarity', () => {
    expect(matcher.calculateSimilarity('hello', 'hello')).toBe(1);
    expect(matcher.calculateSimilarity('hello', 'hallo')).toBeGreaterThan(0.5);
    expect(matcher.calculateSimilarity('hello', 'world')).toBeLessThan(0.5);
  });
});

