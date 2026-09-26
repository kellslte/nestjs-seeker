import { BaseStorageAdapter } from './storage.adapter';
import { StorageOptions } from '../interfaces/storage.interface';
import { StorageError } from '../errors/seeker.error';

export abstract class CloudAdapter extends BaseStorageAdapter {
  constructor(options: StorageOptions = {}) {
    super(options);
    if (!options.bucket && !options.connectionString) {
      throw new StorageError('Cloud adapter requires bucket or connectionString option');
    }
  }

  protected getKey(indexName: string): string {
    return `indexes/${this.validateIndexName(indexName)}.seeker`;
  }
}
