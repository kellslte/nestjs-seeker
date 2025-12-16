import { StorageAdapter, StorageOptions } from '../interfaces/storage.interface';
import { IndexData } from '../types';

export abstract class BaseStorageAdapter implements StorageAdapter {
  protected options: StorageOptions;

  constructor(options: StorageOptions = {}) {
    this.options = {
      compression: true,
      compressionType: 'gzip',
      ...options,
    };
  }

  abstract read(indexName: string): Promise<IndexData | null>;
  abstract write(indexName: string, data: IndexData): Promise<void>;
  abstract delete(indexName: string): Promise<void>;
  abstract exists(indexName: string): Promise<boolean>;
  abstract list(): Promise<string[]>;

  protected serialize(data: IndexData): string {
    const serializable = {
      documents: Array.from(data.documents.entries()),
      invertedIndex: data.invertedIndex,
      metadata: {
        ...data.metadata,
        createdAt: data.metadata.createdAt.toISOString(),
        updatedAt: data.metadata.updatedAt.toISOString(),
      },
    };
    return JSON.stringify(serializable);
  }

  protected deserialize(json: string): IndexData {
    const parsed = JSON.parse(json);
    const documents = new Map<string, any>(parsed.documents);

    // Convert date strings back to Date objects
    documents.forEach((doc) => {
      doc.createdAt = new Date(doc.createdAt);
      doc.updatedAt = new Date(doc.updatedAt);
    });

    return {
      documents,
      invertedIndex: parsed.invertedIndex,
      metadata: {
        ...parsed.metadata,
        createdAt: new Date(parsed.metadata.createdAt),
        updatedAt: new Date(parsed.metadata.updatedAt),
      },
    };
  }
}
