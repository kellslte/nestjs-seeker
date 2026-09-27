import { Injectable } from '@nestjs/common';
import { IndexManager } from '../index-manager';
import { SearchQuery, SearchResponse, SearchResult } from '../interfaces/search.interface';
import { IndexNotFoundError } from '../errors/seeker.error';
import { QueryParser } from '../engine/query.parser';
import { RelevanceScorer } from '../engine/relevance.scorer';
import { FuzzyMatcher } from '../engine/fuzzy.matcher';
import { FacetProcessor } from '../engine/facet.processor';
import { IndexData } from '../types';
import { DEFAULT_FUZZY_THRESHOLD, DEFAULT_MAX_RESULTS, DEFAULT_MIN_SCORE } from '../constants';

@Injectable()
export class SearchService {
  private queryParser: QueryParser;
  private relevanceScorer: RelevanceScorer;
  private fuzzyMatcher: FuzzyMatcher;
  private facetProcessor: FacetProcessor;
  private fuzzyThreshold: number;

  constructor(
    private readonly indexManager: IndexManager,
    fuzzyThreshold?: number,
  ) {
    this.fuzzyThreshold = fuzzyThreshold ?? DEFAULT_FUZZY_THRESHOLD;
    this.queryParser = new QueryParser();
    this.relevanceScorer = new RelevanceScorer();
    this.fuzzyMatcher = new FuzzyMatcher(this.fuzzyThreshold);
    this.facetProcessor = new FacetProcessor();
  }

  async search(query: SearchQuery): Promise<SearchResponse> {
    const startTime = Date.now();

    // Load index
    const indexData = await this.indexManager.loadIndex(query.indexName);
    if (!indexData) {
      throw new IndexNotFoundError(query.indexName);
    }

    // Parse query
    const queryTerms = this.queryParser.parse(query.query);
    if (queryTerms.length === 0) {
      return {
        results: [],
        total: 0,
        query: query.query,
        took: Date.now() - startTime,
      };
    }

    // Get searchable fields
    const searchFields = query.fields || this.getSearchableFields(indexData);

    // Fuzzy compares query words to the index's words (not raw field text), then scores via postings
    const fuzzyTerms = query.fuzzy ? this.matchVocabulary(queryTerms, indexData) : undefined;
    const lookupTerms = fuzzyTerms
      ? fuzzyTerms.flatMap((matches) => [...matches.keys()])
      : queryTerms;
    let candidateIds = [
      ...new Set(lookupTerms.flatMap((term) => Object.keys(indexData.invertedIndex[term] ?? {}))),
    ];
    const filters = query.filters;
    if (filters) {
      candidateIds = candidateIds.filter((id) => {
        const doc = indexData.documents.get(id);
        return doc !== undefined && this.facetProcessor.matchesFilters(doc, filters);
      });
    }

    const avgFieldLengths: Record<string, number> = {};
    if (!query.fuzzy) {
      searchFields.forEach((field) => {
        avgFieldLengths[field] = this.relevanceScorer.calculateAvgFieldLength(
          indexData.documents,
          field,
        );
      });
    }

    // Score documents
    const scoredDocuments: Array<{ documentId: string; score: number }> = [];

    candidateIds.forEach((documentId) => {
      let score = 0;

      if (fuzzyTerms) {
        // Each query word scores its best-matching index word per field
        searchFields.forEach((field) => {
          fuzzyTerms.forEach((matches) => {
            let best = 0;
            matches.forEach((similarity, term) => {
              if (indexData.invertedIndex[term][documentId]?.[field] && similarity > best) {
                best = similarity;
              }
            });
            score += best * (indexData.metadata.fieldConfig[field]?.weight || 1.0);
          });
        });
      } else {
        // Use BM25 scoring
        score = this.relevanceScorer.scoreDocument(
          queryTerms,
          documentId,
          searchFields,
          indexData.invertedIndex,
          indexData.documents,
          indexData.metadata.fieldConfig,
          avgFieldLengths,
        );
      }

      if (score > 0) {
        scoredDocuments.push({ documentId, score });
      }
    });

    // Sort by score
    scoredDocuments.sort((a, b) => b.score - a.score);

    // Apply min score filter
    const minScore = query.minScore ?? DEFAULT_MIN_SCORE;
    const filtered = scoredDocuments.filter((item) => item.score >= minScore);

    // Paginate
    const limit = query.limit ?? DEFAULT_MAX_RESULTS;
    const offset = query.offset ?? 0;
    const paginated = filtered.slice(offset, offset + limit);

    // Build results
    const results: SearchResult[] = paginated.map((item) => {
      const document = indexData.documents.get(item.documentId)!;
      return {
        document,
        score: item.score,
        highlights: this.generateHighlights(document, lookupTerms, searchFields),
      };
    });

    // Process facets if requested
    const facets = query.facets
      ? this.facetProcessor.processFacets(
          indexData.documents,
          query.facets,
          paginated.map((item) => item.documentId),
        )
      : undefined;

    return {
      results,
      total: filtered.length,
      facets,
      query: query.query,
      took: Date.now() - startTime,
    };
  }

  // ponytail: scans the whole vocabulary per query word; a BK-tree or n-gram index if vocabularies get huge
  private matchVocabulary(queryTerms: string[], indexData: IndexData): Map<string, number>[] {
    const vocabulary = Object.keys(indexData.invertedIndex);
    return queryTerms.map((queryTerm) => {
      const matches = new Map<string, number>();
      for (const term of vocabulary) {
        // Length gap is a lower bound on edit distance: skip what can't reach the cutoff
        if (Math.abs(term.length - queryTerm.length) > this.fuzzyThreshold) continue;
        if (this.fuzzyMatcher.isMatch(term, queryTerm)) {
          matches.set(term, this.fuzzyMatcher.calculateSimilarity(term, queryTerm));
        }
      }
      return matches;
    });
  }

  private getSearchableFields(indexData: IndexData): string[] {
    const config = indexData.metadata.fieldConfig;
    const configured = Object.keys(config).filter((field) => config[field].searchable !== false);
    if (configured.length > 0) {
      return configured;
    }

    // No searchable fields configured (manual indexing): search every field seen in the index
    const fields = new Set<string>();
    indexData.documents.forEach((doc) => Object.keys(doc.fields).forEach((f) => fields.add(f)));
    return [...fields].filter((field) => config[field]?.searchable !== false);
  }

  private generateHighlights(
    document: any,
    terms: string[],
    fields: string[],
  ): Record<string, string[]> {
    const highlights: Record<string, string[]> = {};

    fields.forEach((field) => {
      const value = String(document.fields[field] || '');
      const fieldHighlights: string[] = [];

      terms.forEach((term) => {
        const regex = new RegExp(`(${term})`, 'gi');
        if (regex.test(value)) {
          const matches = value.match(regex);
          if (matches) {
            fieldHighlights.push(...matches);
          }
        }
      });

      if (fieldHighlights.length > 0) {
        highlights[field] = [...new Set(fieldHighlights)];
      }
    });

    return highlights;
  }
}
