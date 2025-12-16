import { BaseStorageAdapter } from './storage.adapter';
import { StorageOptions } from '../interfaces/storage.interface';
import { IndexData } from '../types';

export class InMemoryAdapter extends BaseStorageAdapter {
  private storage: Map<string, IndexData> = new Map();

  constructor(options: StorageOptions = {}) {
    super(options);
  }

  async read(indexName: string): Promise<IndexData | null> {
    const data = this.storage.get(indexName);
    if (!data) {
      return null;
    }
    // Return a deep copy to prevent external mutations
    return this.deserialize(this.serialize(data));
  }

  async write(indexName: string, data: IndexData): Promise<void> {
    // Store a deep copy
    this.storage.set(indexName, this.deserialize(this.serialize(data)));
  }

  async delete(indexName: string): Promise<void> {
    this.storage.delete(indexName);
  }

  async exists(indexName: string): Promise<boolean> {
    return this.storage.has(indexName);
  }

  async list(): Promise<string[]> {
    return Array.from(this.storage.keys());
  }

  clear(): void {
    this.storage.clear();
  }
}

