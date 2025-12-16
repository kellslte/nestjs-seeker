import { BaseStorageAdapter } from './storage.adapter';
import { StorageOptions } from '../interfaces/storage.interface';
import { IndexData } from '../types';
import { CompressionUtil } from './compression.util';
import { StorageError } from '../errors/seeker.error';

export abstract class CloudAdapter extends BaseStorageAdapter {
  constructor(options: StorageOptions = {}) {
    super(options);
    if (!options.bucket && !options.connectionString) {
      throw new StorageError('Cloud adapter requires bucket or connectionString option');
    }
  }

  protected async compressData(data: string): Promise<Buffer> {
    if (this.options.compression) {
      return CompressionUtil.compress(
        data,
        this.options.compressionType,
        this.options.compression ? 6 : 0,
      );
    }
    return Buffer.from(data, 'utf-8');
  }

  protected async decompressData(data: Buffer): Promise<string> {
    if (this.options.compression && CompressionUtil.isCompressed(data)) {
      return CompressionUtil.decompress(data, this.options.compressionType);
    }
    return data.toString('utf-8');
  }

  protected getKey(indexName: string): string {
    return `indexes/${indexName}.seeker`;
  }
}

