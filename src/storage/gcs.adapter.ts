import { CloudAdapter } from './cloud.adapter';
import { StorageOptions } from '../interfaces/storage.interface';
import { IndexData } from '../types';
import { StorageError } from '../errors/seeker.error';

let Storage: any;

try {
  Storage = require('@google-cloud/storage').Storage;
} catch (error) {
  // GCS SDK not installed
}

export class GCSAdapter extends CloudAdapter {
  private storage: any;
  private bucket: any;

  constructor(options: StorageOptions = {}) {
    super(options);
    
    if (!Storage) {
      throw new StorageError(
        '@google-cloud/storage is not installed. Install it as an optional dependency.',
      );
    }

    if (!options.bucket) {
      throw new StorageError('GCS adapter requires bucket option');
    }

    this.storage = new Storage();
    this.bucket = this.storage.bucket(options.bucket);
  }

  async read(indexName: string): Promise<IndexData | null> {
    try {
      const file = this.bucket.file(this.getKey(indexName));
      const [exists] = await file.exists();
      
      if (!exists) {
        return null;
      }

      const [buffer] = await file.download();
      const json = await this.decompressData(buffer);
      return this.deserialize(json);
    } catch (error) {
      throw new StorageError(`Failed to read index from GCS: ${indexName}`, error as Error);
    }
  }

  async write(indexName: string, data: IndexData): Promise<void> {
    try {
      const json = this.serialize(data);
      const buffer = await this.compressData(json);
      
      const file = this.bucket.file(this.getKey(indexName));
      await file.save(buffer, {
        contentType: 'application/octet-stream',
      });
    } catch (error) {
      throw new StorageError(`Failed to write index to GCS: ${indexName}`, error as Error);
    }
  }

  async delete(indexName: string): Promise<void> {
    try {
      const file = this.bucket.file(this.getKey(indexName));
      await file.delete();
    } catch (error: any) {
      if (error.code !== 404) {
        throw new StorageError(`Failed to delete index from GCS: ${indexName}`, error);
      }
    }
  }

  async exists(indexName: string): Promise<boolean> {
    try {
      const file = this.bucket.file(this.getKey(indexName));
      const [exists] = await file.exists();
      return exists;
    } catch {
      return false;
    }
  }

  async list(): Promise<string[]> {
    try {
      const [files] = await this.bucket.getFiles({ prefix: 'indexes/' });
      return files
        .map((file: any) => file.name)
        .filter((name: string) => name.endsWith('.seeker'))
        .map((name: string) => name.replace('indexes/', '').replace('.seeker', ''));
    } catch (error) {
      throw new StorageError('Failed to list indexes from GCS', error as Error);
    }
  }
}

