import { Injectable } from '@nestjs/common';
import { IndexManager } from '../index-manager';
import { SuggestionQuery, SuggestionResult } from '../interfaces/search.interface';
import { IndexNotFoundError } from '../errors/seeker.error';
import { QueryParser } from '../engine/query.parser';
import { FuzzyMatcher } from '../engine/fuzzy.matcher';
import { DEFAULT_FUZZY_THRESHOLD } from '../constants';

@Injectable()
export class SuggestionService {
  private queryParser: QueryParser;
  private fuzzyMatcher: FuzzyMatcher;

  constructor(
    private readonly indexManager: IndexManager,
    fuzzyThreshold?: number,
  ) {
    this.queryParser = new QueryParser();
    this.fuzzyMatcher = new FuzzyMatcher(fuzzyThreshold ?? DEFAULT_FUZZY_THRESHOLD);
  }

  async suggest(query: SuggestionQuery): Promise<SuggestionResult[]> {
    const indexData = await this.indexManager.loadIndex(query.indexName);
    if (!indexData) {
      throw new IndexNotFoundError(query.indexName);
    }

    const queryLower = query.query.toLowerCase();
    const suggestions: Map<string, number> = new Map();
    const field = query.field;

    // Collect unique terms from documents
    const terms = new Set<string>();
    
    indexData.documents.forEach((document) => {
      if (field) {
        const value = document.fields[field];
        if (value) {
          const fieldTerms = this.queryParser.extractTerms(String(value));
          fieldTerms.forEach((term) => terms.add(term));
        }
      } else {
        Object.values(document.fields).forEach((value) => {
          const fieldTerms = this.queryParser.extractTerms(String(value));
          fieldTerms.forEach((term) => terms.add(term));
        });
      }
    });

    // Find matching terms
    terms.forEach((term) => {
      if (term.startsWith(queryLower) || this.fuzzyMatcher.isMatch(term, queryLower)) {
        const similarity = term.startsWith(queryLower)
          ? 1.0
          : this.fuzzyMatcher.calculateSimilarity(term, queryLower);
        
        if (similarity > 0.3) {
          const currentScore = suggestions.get(term) || 0;
          suggestions.set(term, Math.max(currentScore, similarity));
        }
      }
    });

    // Convert to array and sort
    const results: SuggestionResult[] = Array.from(suggestions.entries())
      .map(([text, score]) => ({ text, score }))
      .sort((a, b) => b.score - a.score);

    // Limit results
    const limit = query.limit || 10;
    return results.slice(0, limit);
  }
}

