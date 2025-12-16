import { CloudAdapter } from './cloud.adapter';
import { StorageOptions } from '../interfaces/storage.interface';
import { IndexData } from '../types';
import { StorageError } from '../errors/seeker.error';

let Redis: any;

try {
  Redis = require('ioredis');
} catch (error) {
  try {
    Redis = require('redis');
  } catch {
    // Redis not installed
  }
}

export class RedisAdapter extends CloudAdapter {
  private client: any;
  private keyPrefix: string;

  constructor(options: StorageOptions = {}) {
    super(options);
    
    if (!Redis) {
      throw new StorageError(
        'ioredis or redis is not installed. Install it as an optional dependency.',
      );
    }

    this.keyPrefix = 'seeker:index:';
    
    if (options.connectionString) {
      this.client = new Redis(options.connectionString);
    } else {
      this.client = new Redis({
        host: 'localhost',
        port: 6379,
      });
    }
  }

  private getRedisKey(indexName: string): string {
    return `${this.keyPrefix}${indexName}`;
  }

  async read(indexName: string): Promise<IndexData | null> {
    try {
      const key = this.getRedisKey(indexName);
      const data = await this.client.get(key);
      
      if (!data) {
        return null;
      }

      const buffer = Buffer.from(data, 'base64');
      const json = await this.decompressData(buffer);
      return this.deserialize(json);
    } catch (error) {
      throw new StorageError(`Failed to read index from Redis: ${indexName}`, error as Error);
    }
  }

  async write(indexName: string, data: IndexData): Promise<void> {
    try {
      const json = this.serialize(data);
      const buffer = await this.compressData(json);
      const key = this.getRedisKey(indexName);
      
      await this.client.set(key, buffer.toString('base64'));
    } catch (error) {
      throw new StorageError(`Failed to write index to Redis: ${indexName}`, error as Error);
    }
  }

  async delete(indexName: string): Promise<void> {
    try {
      const key = this.getRedisKey(indexName);
      await this.client.del(key);
    } catch (error) {
      throw new StorageError(`Failed to delete index from Redis: ${indexName}`, error as Error);
    }
  }

  async exists(indexName: string): Promise<boolean> {
    try {
      const key = this.getRedisKey(indexName);
      const result = await this.client.exists(key);
      return result === 1;
    } catch {
      return false;
    }
  }

  async list(): Promise<string[]> {
    try {
      const keys = await this.client.keys(`${this.keyPrefix}*`);
      return keys.map((key: string) => key.replace(this.keyPrefix, ''));
    } catch (error) {
      throw new StorageError('Failed to list indexes from Redis', error as Error);
    }
  }
}

