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

    // BM25 only scores documents containing a query term; fuzzy has to look at everything
    let candidateIds = query.fuzzy
      ? Array.from(indexData.documents.keys())
      : [
          ...new Set(
            queryTerms.flatMap((term) => Object.keys(indexData.invertedIndex[term] ?? {})),
          ),
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

      if (query.fuzzy) {
        // Use fuzzy matching
        const document = indexData.documents.get(documentId);
        if (document) {
          searchFields.forEach((field) => {
            const fieldValue = String(document.fields[field] || '');
            queryTerms.forEach((term) => {
              const similarity = this.fuzzyMatcher.calculateSimilarity(
                term,
                fieldValue.toLowerCase(),
              );
              if (similarity > 0.5) {
                score += similarity * (indexData.metadata.fieldConfig[field]?.weight || 1.0);
              }
            });
          });
        }
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
        highlights: this.generateHighlights(document, queryTerms, searchFields),
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
