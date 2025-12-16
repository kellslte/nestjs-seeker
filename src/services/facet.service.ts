import { Injectable } from '@nestjs/common';
import { IndexManager } from '../index-manager';
import { FacetResult } from '../interfaces/search.interface';
import { IndexNotFoundError } from '../errors/seeker.error';
import { FacetProcessor } from '../engine/facet.processor';

@Injectable()
export class FacetService {
  private facetProcessor: FacetProcessor;

  constructor(private readonly indexManager: IndexManager) {
    this.facetProcessor = new FacetProcessor();
  }

  async getFacets(
    indexName: string,
    facetFields: string[],
    documentIds?: string[],
  ): Promise<Record<string, FacetResult>> {
    const indexData = await this.indexManager.loadIndex(indexName);
    if (!indexData) {
      throw new IndexNotFoundError(indexName);
    }

    const ids = documentIds || Array.from(indexData.documents.keys());
    return this.facetProcessor.processFacets(indexData.documents, facetFields, ids);
  }

  async filterByFacets(
    indexName: string,
    facetFilters: Record<string, any>,
  ): Promise<string[]> {
    const indexData = await this.indexManager.loadIndex(indexName);
    if (!indexData) {
      throw new IndexNotFoundError(indexName);
    }

    return this.facetProcessor.filterByFacets(indexData.documents, facetFilters);
  }
}

