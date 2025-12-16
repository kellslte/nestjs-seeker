import { Document, FieldConfig } from '../types';

export interface Indexer {
  index(indexName: string, document: Document): Promise<void>;
  indexBatch(indexName: string, documents: Document[]): Promise<void>;
  remove(indexName: string, documentId: string): Promise<void>;
  update(indexName: string, document: Document): Promise<void>;
  getFieldConfig(entity: any): Record<string, FieldConfig>;
}
