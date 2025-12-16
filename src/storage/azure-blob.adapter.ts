import { CloudAdapter } from './cloud.adapter';
import { StorageOptions } from '../interfaces/storage.interface';
import { IndexData } from '../types';
import { StorageError } from '../errors/seeker.error';

let BlobServiceClient: any;
let ContainerClient: any;

try {
  const azureModule = require('@azure/storage-blob');
  BlobServiceClient = azureModule.BlobServiceClient;
  ContainerClient = azureModule.ContainerClient;
} catch (error) {
  // Azure SDK not installed
}

export class AzureBlobAdapter extends CloudAdapter {
  private containerClient: any;
  private containerName: string;

  constructor(options: StorageOptions = {}) {
    super(options);
    
    if (!BlobServiceClient) {
      throw new StorageError(
        '@azure/storage-blob is not installed. Install it as an optional dependency.',
      );
    }

    if (!options.connectionString && !options.bucket) {
      throw new StorageError('Azure adapter requires connectionString or bucket option');
    }

    this.containerName = options.bucket || 'indexes';
    
    if (options.connectionString) {
      const blobServiceClient = BlobServiceClient.fromConnectionString(options.connectionString);
      this.containerClient = blobServiceClient.getContainerClient(this.containerName);
    } else {
      throw new StorageError('Azure adapter requires connectionString');
    }
  }

  async read(indexName: string): Promise<IndexData | null> {
    try {
      const blobClient = this.containerClient.getBlobClient(this.getKey(indexName));
      const exists = await blobClient.exists();
      
      if (!exists) {
        return null;
      }

      const downloadResponse = await blobClient.download();
      const chunks: Buffer[] = [];
      
      for await (const chunk of downloadResponse.readableStreamBody) {
        chunks.push(chunk);
      }
      
      const buffer = Buffer.concat(chunks);
      const json = await this.decompressData(buffer);
      return this.deserialize(json);
    } catch (error) {
      throw new StorageError(`Failed to read index from Azure: ${indexName}`, error as Error);
    }
  }

  async write(indexName: string, data: IndexData): Promise<void> {
    try {
      const json = this.serialize(data);
      const buffer = await this.compressData(json);
      
      const blobClient = this.containerClient.getBlobClient(this.getKey(indexName));
      await blobClient.upload(buffer, buffer.length, {
        blobHTTPHeaders: { blobContentType: 'application/octet-stream' },
      });
    } catch (error) {
      throw new StorageError(`Failed to write index to Azure: ${indexName}`, error as Error);
    }
  }

  async delete(indexName: string): Promise<void> {
    try {
      const blobClient = this.containerClient.getBlobClient(this.getKey(indexName));
      await blobClient.delete();
    } catch (error: any) {
      if (error.statusCode !== 404) {
        throw new StorageError(`Failed to delete index from Azure: ${indexName}`, error);
      }
    }
  }

  async exists(indexName: string): Promise<boolean> {
    try {
      const blobClient = this.containerClient.getBlobClient(this.getKey(indexName));
      return await blobClient.exists();
    } catch {
      return false;
    }
  }

  async list(): Promise<string[]> {
    try {
      const blobs: string[] = [];
      
      for await (const blob of this.containerClient.listBlobsFlat({ prefix: 'indexes/' })) {
        if (blob.name.endsWith('.seeker')) {
          blobs.push(blob.name.replace('indexes/', '').replace('.seeker', ''));
        }
      }
      
      return blobs;
    } catch (error) {
      throw new StorageError('Failed to list indexes from Azure', error as Error);
    }
  }
}

