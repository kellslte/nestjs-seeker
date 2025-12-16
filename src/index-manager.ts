import { Injectable } from '@nestjs/common';
import { StorageAdapter } from './interfaces/storage.interface';
import { IndexData, IndexMetadata, Document, FieldConfig, AnalyzerType } from './types';
import { QueryParser } from './engine/query.parser';
import { DEFAULT_ANALYZER } from './constants';

@Injectable()
export class IndexManager {
  private indexes: Map<string, IndexData> = new Map();
  private storage: StorageAdapter;
  private analyzer: AnalyzerType;

  constructor(storage: StorageAdapter, analyzer: AnalyzerType = DEFAULT_ANALYZER) {
    this.storage = storage;
    this.analyzer = analyzer;
  }

  async loadIndex(indexName: string): Promise<IndexData | null> {
    if (this.indexes.has(indexName)) {
      return this.indexes.get(indexName)!;
    }

    const data = await this.storage.read(indexName);
    if (data) {
      this.indexes.set(indexName, data);
    }
    return data;
  }

  async saveIndex(indexName: string, data: IndexData): Promise<void> {
    this.indexes.set(indexName, data);
    await this.storage.write(indexName, data);
  }

  getIndex(indexName: string): IndexData | null {
    return this.indexes.get(indexName) || null;
  }

  async createIndex(
    indexName: string,
    fieldConfig: Record<string, FieldConfig> = {},
    analyzer: AnalyzerType = DEFAULT_ANALYZER,
  ): Promise<IndexData> {
    const metadata: IndexMetadata = {
      name: indexName,
      createdAt: new Date(),
      updatedAt: new Date(),
      documentCount: 0,
      fieldConfig,
      analyzer,
    };

    const indexData: IndexData = {
      documents: new Map(),
      invertedIndex: {},
      metadata,
    };

    await this.saveIndex(indexName, indexData);
    return indexData;
  }

  async addDocument(
    indexName: string,
    document: Document,
    fieldConfig: Record<string, FieldConfig>,
  ): Promise<void> {
    let indexData = await this.loadIndex(indexName);
    if (!indexData) {
      indexData = await this.createIndex(indexName, fieldConfig);
    }

    const parser = new QueryParser(indexData.metadata.analyzer);
    const now = new Date();

    // Update document timestamps
    document.createdAt = document.createdAt || now;
    document.updatedAt = now;

    // Add document
    indexData.documents.set(document.id, document);

    // Update inverted index
    Object.entries(document.fields).forEach(([field, value]) => {
      const config = fieldConfig[field] || {};
      if (config.searchable === false) {
        return;
      }

      const text = String(value);
      const terms = parser.extractTerms(text);

      terms.forEach((term, position) => {
        if (!indexData.invertedIndex[term]) {
          indexData.invertedIndex[term] = {};
        }

        if (!indexData.invertedIndex[term][document.id]) {
          indexData.invertedIndex[term][document.id] = {
            field,
            frequency: 0,
            positions: [],
          };
        }

        indexData.invertedIndex[term][document.id].frequency++;
        indexData.invertedIndex[term][document.id].positions.push(position);
      });
    });

    // Update metadata
    indexData.metadata.documentCount = indexData.documents.size;
    indexData.metadata.updatedAt = now;

    await this.saveIndex(indexName, indexData);
  }

  async removeDocument(indexName: string, documentId: string): Promise<void> {
    const indexData = await this.loadIndex(indexName);
    if (!indexData) {
      return;
    }

    const document = indexData.documents.get(documentId);
    if (!document) {
      return;
    }

    // Remove from documents
    indexData.documents.delete(documentId);

    // Remove from inverted index
    Object.keys(indexData.invertedIndex).forEach((term) => {
      delete indexData.invertedIndex[term][documentId];

      // Clean up empty terms
      if (Object.keys(indexData.invertedIndex[term]).length === 0) {
        delete indexData.invertedIndex[term];
      }
    });

    // Update metadata
    indexData.metadata.documentCount = indexData.documents.size;
    indexData.metadata.updatedAt = new Date();

    await this.saveIndex(indexName, indexData);
  }

  async updateDocument(
    indexName: string,
    document: Document,
    fieldConfig: Record<string, FieldConfig>,
  ): Promise<void> {
    await this.removeDocument(indexName, document.id);
    await this.addDocument(indexName, document, fieldConfig);
  }

  async deleteIndex(indexName: string): Promise<void> {
    this.indexes.delete(indexName);
    await this.storage.delete(indexName);
  }
}
