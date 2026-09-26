import { StorageAdapter, StorageOptions } from '../interfaces/storage.interface';
import { IndexData } from '../types';
import { SeekerError } from '../errors/seeker.error';
import * as zlib from 'zlib';
import { promisify } from 'util';
import { DEFAULT_COMPRESSION_LEVEL } from '../constants';

const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);
const brotliCompress = promisify(zlib.brotliCompress);
const brotliDecompress = promisify(zlib.brotliDecompress);

// Index names become file paths and object keys: block path separators and NUL
export function validateIndexName(indexName: string): string {
  if (typeof indexName !== 'string' || !/^[^/\\\0]{1,200}$/.test(indexName)) {
    throw new SeekerError(`Invalid index name: "${indexName}"`, 'INVALID_INDEX_NAME', 400);
  }
  return indexName;
}

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

  // Async zlib runs on the threadpool, so large indexes don't block the event loop
  protected async compressData(json: string): Promise<Buffer> {
    const { compression, compressionType } = this.options;
    if (!compression) {
      return Buffer.from(json, 'utf-8');
    }
    return compressionType === 'brotli'
      ? brotliCompress(json, {
          params: { [zlib.constants.BROTLI_PARAM_QUALITY]: DEFAULT_COMPRESSION_LEVEL },
        })
      : gzip(json, { level: DEFAULT_COMPRESSION_LEVEL });
  }

  // Detects the format from the bytes, so data written under any setting stays readable
  protected async decompressData(data: Buffer): Promise<string> {
    if (data[0] === 0x7b) {
      return data.toString('utf-8'); // '{': uncompressed JSON
    }
    if (data[0] === 0x1f && data[1] === 0x8b) {
      return (await gunzip(data)).toString('utf-8');
    }
    return (await brotliDecompress(data)).toString('utf-8');
  }

  protected validateIndexName(indexName: string): string {
    return validateIndexName(indexName);
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
        // Pre-3.0 format stored one { field, frequency, positions } per doc
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
