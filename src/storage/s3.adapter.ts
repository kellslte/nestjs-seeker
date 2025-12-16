import { CloudAdapter } from './cloud.adapter';
import { StorageOptions } from '../interfaces/storage.interface';
import { IndexData } from '../types';
import { StorageError } from '../errors/seeker.error';

let S3Client: any;
let PutObjectCommand: any;
let GetObjectCommand: any;
let DeleteObjectCommand: any;
let ListObjectsV2Command: any;

try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const s3Module = require('@aws-sdk/client-s3');
  S3Client = s3Module.S3Client;
  PutObjectCommand = s3Module.PutObjectCommand;
  GetObjectCommand = s3Module.GetObjectCommand;
  DeleteObjectCommand = s3Module.DeleteObjectCommand;
  ListObjectsV2Command = s3Module.ListObjectsV2Command;
} catch (error) {
  // AWS SDK not installed
}

export class S3Adapter extends CloudAdapter {
  private client: any;
  private bucket: string;

  constructor(options: StorageOptions = {}) {
    super(options);

    if (!S3Client) {
      throw new StorageError(
        '@aws-sdk/client-s3 is not installed. Install it as an optional dependency.',
      );
    }

    if (!options.bucket) {
      throw new StorageError('S3 adapter requires bucket option');
    }

    this.bucket = options.bucket;
    this.client = new S3Client({
      region: options.region || 'us-east-1',
      credentials: options.credentials,
    });
  }

  async read(indexName: string): Promise<IndexData | null> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: this.getKey(indexName),
      });

      const response = await this.client.send(command);
      const chunks: Buffer[] = [];

      for await (const chunk of response.Body) {
        chunks.push(chunk);
      }

      const buffer = Buffer.concat(chunks);
      const json = await this.decompressData(buffer);
      return this.deserialize(json);
    } catch (error: any) {
      if (error.name === 'NoSuchKey' || error.$metadata?.httpStatusCode === 404) {
        return null;
      }
      throw new StorageError(`Failed to read index from S3: ${indexName}`, error);
    }
  }

  async write(indexName: string, data: IndexData): Promise<void> {
    try {
      const json = this.serialize(data);
      const buffer = await this.compressData(json);

      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: this.getKey(indexName),
        Body: buffer,
        ContentType: 'application/octet-stream',
      });

      await this.client.send(command);
    } catch (error) {
      throw new StorageError(`Failed to write index to S3: ${indexName}`, error as Error);
    }
  }

  async delete(indexName: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: this.getKey(indexName),
      });

      await this.client.send(command);
    } catch (error: any) {
      if (error.name !== 'NoSuchKey' && error.$metadata?.httpStatusCode !== 404) {
        throw new StorageError(`Failed to delete index from S3: ${indexName}`, error);
      }
    }
  }

  async exists(indexName: string): Promise<boolean> {
    try {
      await this.read(indexName);
      return true;
    } catch {
      return false;
    }
  }

  async list(): Promise<string[]> {
    try {
      const command = new ListObjectsV2Command({
        Bucket: this.bucket,
        Prefix: 'indexes/',
      });

      const response = await this.client.send(command);
      const keys = (response.Contents || [])
        .map((obj: any) => obj.Key)
        .filter((key: string) => key.endsWith('.seeker'))
        .map((key: string) => key.replace('indexes/', '').replace('.seeker', ''));

      return keys;
    } catch (error) {
      throw new StorageError('Failed to list indexes from S3', error as Error);
    }
  }
}
