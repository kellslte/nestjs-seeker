import { Document } from '../types';

export interface SearchQuery {
  query: string;
  indexName: string;
  fields?: string[];
  filters?: Record<string, any>;
  facets?: string[];
  limit?: number;
  offset?: number;
  minScore?: number;
  fuzzy?: boolean;
}

export interface SearchResult {
  document: Document;
  score: number;
  highlights?: Record<string, string[]>;
}

export interface SearchResponse {
  results: SearchResult[];
  total: number;
  facets?: Record<string, FacetResult>;
  query: string;
  took: number;
}

export interface FacetResult {
  [value: string]: number;
}

export interface SuggestionQuery {
  query: string;
  indexName: string;
  field?: string;
  limit?: number;
}

export interface SuggestionResult {
  text: string;
  score: number;
}

