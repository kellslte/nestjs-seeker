import { Document, InvertedIndex } from '../types';
import { FacetResult } from '../interfaces/search.interface';

export class FacetProcessor {
  processFacets(
    documents: Map<string, Document>,
    facetFields: string[],
    documentIds: string[],
  ): Record<string, FacetResult> {
    const facets: Record<string, FacetResult> = {};

    facetFields.forEach((field) => {
      facets[field] = {};
      
      documentIds.forEach((docId) => {
        const doc = documents.get(docId);
        if (!doc) {
          return;
        }

        const value = doc.fields[field];
        if (value !== undefined && value !== null) {
          const key = String(value);
          facets[field][key] = (facets[field][key] || 0) + 1;
        }
      });
    });

    return facets;
  }

  filterByFacets(
    documents: Map<string, Document>,
    facetFilters: Record<string, any>,
  ): string[] {
    const matchingIds: string[] = [];

    documents.forEach((doc, docId) => {
      let matches = true;

      Object.entries(facetFilters).forEach(([field, value]) => {
        const docValue = doc.fields[field];
        if (docValue !== value) {
          matches = false;
        }
      });

      if (matches) {
        matchingIds.push(docId);
      }
    });

    return matchingIds;
  }
}

