import { AnalyzerType } from '../types';

export class QueryParser {
  private analyzer: AnalyzerType;

  constructor(analyzer: AnalyzerType = 'standard') {
    this.analyzer = analyzer;
  }

  parse(query: string): string[] {
    const normalized = this.normalize(query);
    return this.tokenize(normalized);
  }

  normalize(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  tokenize(text: string): string[] {
    if (this.analyzer === 'whitespace') {
      return text.split(/\s+/).filter((token) => token.length > 0);
    } else if (this.analyzer === 'simple') {
      return text.split(/\W+/).filter((token) => token.length > 0);
    } else {
      // standard analyzer
      return text.split(/\s+/).filter((token) => token.length > 0);
    }
  }

  extractTerms(text: string): string[] {
    return this.tokenize(this.normalize(text));
  }
}
