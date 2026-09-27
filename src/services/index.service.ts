import { Injectable } from '@nestjs/common';
import { IndexManager } from '../index-manager';
import { Document } from '../types';
import { IndexOptions, IndexInfo } from '../interfaces/index.interface';
import { IndexNotFoundError } from '../errors/seeker.error';
import { getFieldConfig } from '../indexers/decorator.indexer';

@Injectable()
export class IndexService {
  constructor(private readonly indexManager: IndexManager) {}

  async createIndex(options: IndexOptions): Promise<void> {
    await this.indexManager.createIndex(options.name, options.fieldConfig || {}, options.analyzer);
  }

  async deleteIndex(indexName: string): Promise<void> {
    await this.indexManager.deleteIndex(indexName);
  }

  async index(indexName: string, document: Document, entity?: any): Promise<void> {
    const fieldConfig = entity ? getFieldConfig(entity) : {};
    await this.indexManager.addDocument(indexName, document, fieldConfig);
  }

  async indexBatch(indexName: string, documents: Document[], entities?: any[]): Promise<void> {
    // Start from the latest stored copy; each addDocument then reuses it
    await this.indexManager.loadIndex(indexName);
    try {
      for (let i = 0; i < documents.length; i++) {
        const entity = entities?.[i];
        const fieldConfig = entity ? getFieldConfig(entity) : {};
        await this.indexManager.addDocument(indexName, documents[i], fieldConfig, false);
      }
    } finally {
      // Persist whatever made it into the cache, even if a document failed
      await this.indexManager.persist(indexName);
    }
  }

  async remove(indexName: string, documentId: string): Promise<void> {
    await this.indexManager.removeDocument(indexName, documentId);
  }

  async update(indexName: string, document: Document, entity?: any): Promise<void> {
    const fieldConfig = entity ? getFieldConfig(entity) : {};
    await this.indexManager.updateDocument(indexName, document, fieldConfig);
  }

  async getIndexInfo(indexName: string): Promise<IndexInfo> {
    const indexData = await this.indexManager.loadIndex(indexName);
    if (!indexData) {
      throw new IndexNotFoundError(indexName);
    }

    return {
      name: indexData.metadata.name,
      documentCount: indexData.metadata.documentCount,
      createdAt: indexData.metadata.createdAt,
      updatedAt: indexData.metadata.updatedAt,
    };
  }

  async listIndexes(): Promise<string[]> {
    return this.indexManager.listIndexes();
  }
}
