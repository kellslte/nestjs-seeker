// Main module exports
export { SeekerModule } from './seeker.module';
export { SeekerService } from './seeker.service';

// Service exports
export { IndexService } from './services/index.service';
export { SearchService } from './services/search.service';
export { FacetService } from './services/facet.service';
export { SuggestionService } from './services/suggestion.service';

// Interface exports
export * from './interfaces';

// Type exports
export * from './types';

// Error exports
export {
  SeekerError,
  IndexNotFoundError,
  DocumentNotFoundError,
  StorageError,
} from './errors/seeker.error';

// Decorator exports
export { Indexable } from './decorators/indexable.decorator';
export { Searchable } from './decorators/searchable.decorator';
export type { SearchableOptions } from './decorators/searchable.decorator';

// Storage adapter exports
export { InMemoryAdapter } from './storage/in-memory.adapter';
export { FileSystemAdapter } from './storage/file-system.adapter';
export { S3Adapter } from './storage/s3.adapter';
export { GCSAdapter } from './storage/gcs.adapter';
export { AzureBlobAdapter } from './storage/azure-blob.adapter';
export { RedisAdapter } from './storage/redis.adapter';
export { BaseStorageAdapter } from './storage/storage.adapter';
export type { StorageAdapter, StorageOptions } from './interfaces/storage.interface';
