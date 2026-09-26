import { StorageAdapter, StorageOptions } from '../interfaces/storage.interface';
import { IndexData } from '../types';
import { SeekerError } from '../errors/seeker.error';

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

  // Index names become file paths and object keys, so no separators or traversal
  protected validateIndexName(indexName: string): string {
    if (typeof indexName !== 'string' || !/^[\w.-]{1,200}$/.test(indexName)) {
      throw new SeekerError(`Invalid index name: "${indexName}"`, 'INVALID_INDEX_NAME', 400);
    }
    return indexName;
  }

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

    // Null-prototype maps: terms like "__proto__" come from document text
    const invertedIndex = Object.create(null);
    for (const [term, postings] of Object.entries<any>(parsed.invertedIndex || {})) {
      invertedIndex[term] = Object.create(null);
      for (const [docId, entry] of Object.entries<any>(postings)) {
        // Pre-2.1 format stored one { field, frequency, positions } per doc
        invertedIndex[term][docId] =
          typeof entry.field === 'string'
            ? Object.assign(Object.create(null), {
                [entry.field]: { frequency: entry.frequency, positions: entry.positions },
              })
            : Object.assign(Object.create(null), entry);
      }
    }

    return {
      documents,
      invertedIndex,
      metadata: {
        ...parsed.metadata,
        createdAt: new Date(parsed.metadata.createdAt),
        updatedAt: new Date(parsed.metadata.updatedAt),
      },
    };
  }
}
