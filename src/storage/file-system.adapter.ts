import * as fs from 'fs/promises';
import * as path from 'path';
import { BaseStorageAdapter } from './storage.adapter';
import { StorageOptions } from '../interfaces/storage.interface';
import { IndexData } from '../types';
import { CompressionUtil } from './compression.util';
import { StorageError } from '../errors/seeker.error';
import { DEFAULT_INDEX_PATH, DEFAULT_COMPRESSION_LEVEL } from '../constants';

export class FileSystemAdapter extends BaseStorageAdapter {
  private basePath: string;

  constructor(options: StorageOptions = {}) {
    super(options);
    this.basePath = options.path || DEFAULT_INDEX_PATH;
  }

  private getIndexPath(indexName: string): string {
    return path.join(this.basePath, `${indexName}.seeker`);
  }

  private async ensureDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.basePath, { recursive: true });
    } catch (error) {
      throw new StorageError(`Failed to create directory: ${this.basePath}`, error as Error);
    }
  }

  async read(indexName: string): Promise<IndexData | null> {
    try {
      const filePath = this.getIndexPath(indexName);
      const data = await fs.readFile(filePath);
      
      let json: string;
      if (this.options.compression && CompressionUtil.isCompressed(data)) {
        json = CompressionUtil.decompress(data, this.options.compressionType);
      } else {
        json = data.toString('utf-8');
      }
      
      return this.deserialize(json);
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return null;
      }
      throw new StorageError(`Failed to read index: ${indexName}`, error);
    }
  }

  async write(indexName: string, data: IndexData): Promise<void> {
    try {
      await this.ensureDirectory();
      const filePath = this.getIndexPath(indexName);
      const json = this.serialize(data);
      
      let buffer: Buffer;
      if (this.options.compression) {
        buffer = CompressionUtil.compress(
          json,
          this.options.compressionType,
          DEFAULT_COMPRESSION_LEVEL,
        );
      } else {
        buffer = Buffer.from(json, 'utf-8');
      }
      
      await fs.writeFile(filePath, buffer);
    } catch (error) {
      throw new StorageError(`Failed to write index: ${indexName}`, error as Error);
    }
  }

  async delete(indexName: string): Promise<void> {
    try {
      const filePath = this.getIndexPath(indexName);
      await fs.unlink(filePath);
    } catch (error: any) {
      if (error.code !== 'ENOENT') {
        throw new StorageError(`Failed to delete index: ${indexName}`, error);
      }
    }
  }

  async exists(indexName: string): Promise<boolean> {
    try {
      const filePath = this.getIndexPath(indexName);
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  async list(): Promise<string[]> {
    try {
      await this.ensureDirectory();
      const files = await fs.readdir(this.basePath);
      return files
        .filter((file) => file.endsWith('.seeker'))
        .map((file) => file.replace('.seeker', ''));
    } catch (error) {
      throw new StorageError('Failed to list indexes', error as Error);
    }
  }
}

