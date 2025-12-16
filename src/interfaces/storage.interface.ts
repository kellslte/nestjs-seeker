import { IndexData } from '../types';

export interface StorageAdapter {
  read(indexName: string): Promise<IndexData | null>;
  write(indexName: string, data: IndexData): Promise<void>;
  delete(indexName: string): Promise<void>;
  exists(indexName: string): Promise<boolean>;
  list(): Promise<string[]>;
}

export interface StorageOptions {
  path?: string;
  bucket?: string;
  region?: string;
  credentials?: {
    accessKeyId?: string;
    secretAccessKey?: string;
  };
  connectionString?: string;
  compression?: boolean;
  compressionType?: 'gzip' | 'brotli';
}
