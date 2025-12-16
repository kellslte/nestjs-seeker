import { Injectable } from '@nestjs/common';
import { IndexManager } from '../index-manager';
import { Document, FieldConfig } from '../types';
import { IndexOptions, IndexInfo } from '../interfaces/index.interface';
import { IndexNotFoundError } from '../errors/seeker.error';
import { DecoratorIndexer } from '../indexers/decorator.indexer';
import { ManualIndexer } from '../indexers/manual.indexer';

@Injectable()
export class IndexService {
  private decoratorIndexer: DecoratorIndexer;
  private manualIndexer: ManualIndexer;

  constructor(private readonly indexManager: IndexManager) {
    this.decoratorIndexer = new DecoratorIndexer();
    this.manualIndexer = new ManualIndexer();
  }

  async createIndex(options: IndexOptions): Promise<void> {
    await this.indexManager.createIndex(
      options.name,
      options.fieldConfig || {},
      options.analyzer,
    );
  }

  async deleteIndex(indexName: string): Promise<void> {
    await this.indexManager.deleteIndex(indexName);
  }

  async index(indexName: string, document: Document, entity?: any): Promise<void> {
    let fieldConfig: Record<string, FieldConfig> = {};

    if (entity) {
      fieldConfig = this.decoratorIndexer.getFieldConfig(entity);
    }

    await this.indexManager.addDocument(indexName, document, fieldConfig);
  }

  async indexBatch(
    indexName: string,
    documents: Document[],
    entities?: any[],
  ): Promise<void> {
    for (let i = 0; i < documents.length; i++) {
      const entity = entities?.[i];
      await this.index(indexName, documents[i], entity);
    }
  }

  async remove(indexName: string, documentId: string): Promise<void> {
    await this.indexManager.removeDocument(indexName, documentId);
  }

  async update(indexName: string, document: Document, entity?: any): Promise<void> {
    let fieldConfig: Record<string, FieldConfig> = {};

    if (entity) {
      fieldConfig = this.decoratorIndexer.getFieldConfig(entity);
    }

    await this.indexManager.updateDocument(indexName, document, fieldConfig);
  }

  async getIndexInfo(indexName: string): Promise<IndexInfo> {
    const indexData = this.indexManager.getIndex(indexName);
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
    return await this.indexManager['storage'].list();
  }
}

