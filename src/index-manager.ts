import { Injectable } from '@nestjs/common';
import { StorageAdapter } from './interfaces/storage.interface';
import { IndexData, IndexMetadata, Document, FieldConfig, AnalyzerType } from './types';
import { QueryParser } from './engine/query.parser';
import { DEFAULT_ANALYZER } from './constants';
import { validateIndexName } from './storage/storage.adapter';

@Injectable()
export class IndexManager {
  private indexes: Map<string, IndexData> = new Map();
  private storage: StorageAdapter;
  private analyzer: AnalyzerType;
  private shared: boolean;

  // shared: other processes write the same storage, so always re-read instead of trusting the cache
  constructor(storage: StorageAdapter, analyzer: AnalyzerType = DEFAULT_ANALYZER, shared = false) {
    this.storage = storage;
    this.analyzer = analyzer;
    this.shared = shared;
  }

  async loadIndex(indexName: string): Promise<IndexData | null> {
    validateIndexName(indexName);
    if (!this.shared && this.indexes.has(indexName)) {
      return this.indexes.get(indexName)!;
    }

    const data = await this.storage.read(indexName);
    if (data) {
      this.indexes.set(indexName, data);
    }
    return data;
  }

  // ponytail: every save writes the whole index; per-document storage if indexes get large
  async saveIndex(indexName: string, data: IndexData): Promise<void> {
    validateIndexName(indexName);
    this.indexes.set(indexName, data);
    await this.storage.write(indexName, data);
  }

  getIndex(indexName: string): IndexData | null {
    return this.indexes.get(indexName) || null;
  }

  async createIndex(
    indexName: string,
    fieldConfig: Record<string, FieldConfig> = {},
    analyzer: AnalyzerType = this.analyzer,
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
      invertedIndex: Object.create(null),
      metadata,
    };

    await this.saveIndex(indexName, indexData);
    return indexData;
  }

  async addDocument(
    indexName: string,
    document: Document,
    fieldConfig: Record<string, FieldConfig>,
    persist = true,
  ): Promise<void> {
    // Batches (persist = false) keep building on the copy loaded at the start of the batch
    // ponytail: shared mode is last-writer-wins between concurrent writers; add storage locking if two processes write at once
    let indexData = (!persist && this.indexes.get(indexName)) || (await this.loadIndex(indexName));
    if (!indexData) {
      indexData = await this.createIndex(indexName);
    }

    const parser = new QueryParser(indexData.metadata.analyzer);
    const now = new Date();

    // Update document timestamps
    document.createdAt = document.createdAt || now;
    document.updatedAt = now;

    // Re-indexing an existing id replaces it, so drop its old postings first
    if (indexData.documents.has(document.id)) {
      this.removePostings(indexData, document.id);
    }

    // Remember per-call config (e.g. @Searchable({ searchable: false })) for default search fields
    Object.assign(indexData.metadata.fieldConfig, fieldConfig);

    // Store a copy so later caller mutations don't change the indexed document
    indexData.documents.set(document.id, { ...document, fields: { ...document.fields } });

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
          indexData.invertedIndex[term] = Object.create(null);
        }

        const postings = (indexData.invertedIndex[term][document.id] ??= Object.create(null));
        const entry = (postings[field] ??= { frequency: 0, positions: [] });
        entry.frequency++;
        entry.positions.push(position);
      });
    });

    // Update metadata
    indexData.metadata.documentCount = indexData.documents.size;
    indexData.metadata.updatedAt = now;

    if (persist) {
      await this.saveIndex(indexName, indexData);
    }
  }

  async persist(indexName: string): Promise<void> {
    const indexData = this.indexes.get(indexName);
    if (indexData) {
      await this.saveIndex(indexName, indexData);
    }
  }

  // Full sweep: a document's stored fields can't reliably reproduce its terms (Dates reload as strings)
  private removePostings(indexData: IndexData, documentId: string): void {
    for (const term of Object.keys(indexData.invertedIndex)) {
      const postings = indexData.invertedIndex[term];
      if (postings[documentId]) {
        delete postings[documentId];
        if (Object.keys(postings).length === 0) {
          delete indexData.invertedIndex[term];
        }
      }
    }
  }

  async removeDocument(indexName: string, documentId: string): Promise<void> {
    const indexData = await this.loadIndex(indexName);
    if (!indexData) {
      return;
    }

    if (!indexData.documents.delete(documentId)) {
      return;
    }
    this.removePostings(indexData, documentId);

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

  listIndexes(): Promise<string[]> {
    return this.storage.list();
  }

  async deleteIndex(indexName: string): Promise<void> {
    validateIndexName(indexName);
    this.indexes.delete(indexName);
    await this.storage.delete(indexName);
  }
}
