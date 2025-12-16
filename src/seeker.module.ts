import { DynamicModule, Module } from '@nestjs/common';
import { SEEKER_MODULE_OPTIONS } from './constants';
import { SeekerModuleOptions } from './interfaces/module.interface';
import { SeekerService } from './seeker.service';
import { IndexService } from './services/index.service';
import { SearchService } from './services/search.service';
import { FacetService } from './services/facet.service';
import { SuggestionService } from './services/suggestion.service';
import { IndexManager } from './index-manager';
import { StorageAdapter } from './interfaces/storage.interface';
import { InMemoryAdapter } from './storage/in-memory.adapter';
import { FileSystemAdapter } from './storage/file-system.adapter';
import { S3Adapter } from './storage/s3.adapter';
import { GCSAdapter } from './storage/gcs.adapter';
import { AzureBlobAdapter } from './storage/azure-blob.adapter';
import { RedisAdapter } from './storage/redis.adapter';
import { DEFAULT_STORAGE_TYPE, DEFAULT_ANALYZER, DEFAULT_FUZZY_THRESHOLD } from './constants';

@Module({})
export class SeekerModule {
  static forRoot(options: SeekerModuleOptions): DynamicModule {
    const storage = SeekerModule.createStorageAdapter(options);
    const analyzer = options.indexes?.analyzer || DEFAULT_ANALYZER;
    const fuzzyThreshold = options.search?.fuzzyThreshold || DEFAULT_FUZZY_THRESHOLD;

    return {
      module: SeekerModule,
      providers: [
        {
          provide: SEEKER_MODULE_OPTIONS,
          useValue: options,
        },
        {
          provide: 'STORAGE_ADAPTER',
          useValue: storage,
        },
        {
          provide: IndexManager,
          useFactory: (adapter: StorageAdapter) => {
            return new IndexManager(adapter, analyzer);
          },
          inject: ['STORAGE_ADAPTER'],
        },
        IndexService,
        {
          provide: SearchService,
          useFactory: (indexManager: IndexManager) => {
            return new SearchService(indexManager, fuzzyThreshold);
          },
          inject: [IndexManager],
        },
        FacetService,
        {
          provide: SuggestionService,
          useFactory: (indexManager: IndexManager) => {
            return new SuggestionService(indexManager, fuzzyThreshold);
          },
          inject: [IndexManager],
        },
        SeekerService,
      ],
      exports: [SeekerService],
      global: true,
    };
  }

  static forRootAsync(options: {
    imports?: any[];
    useFactory: (...args: any[]) => Promise<SeekerModuleOptions> | SeekerModuleOptions;
    inject?: any[];
  }): DynamicModule {
    return {
      module: SeekerModule,
      imports: options.imports || [],
      providers: [
        {
          provide: SEEKER_MODULE_OPTIONS,
          useFactory: options.useFactory,
          inject: options.inject || [],
        },
        {
          provide: 'STORAGE_ADAPTER',
          useFactory: (moduleOptions: SeekerModuleOptions) => {
            return SeekerModule.createStorageAdapter(moduleOptions);
          },
          inject: [SEEKER_MODULE_OPTIONS],
        },
        {
          provide: IndexManager,
          useFactory: (adapter: StorageAdapter, moduleOptions: SeekerModuleOptions) => {
            const analyzer = moduleOptions.indexes?.analyzer || DEFAULT_ANALYZER;
            return new IndexManager(adapter, analyzer);
          },
          inject: ['STORAGE_ADAPTER', SEEKER_MODULE_OPTIONS],
        },
        IndexService,
        {
          provide: SearchService,
          useFactory: (indexManager: IndexManager, moduleOptions: SeekerModuleOptions) => {
            const fuzzyThreshold = moduleOptions.search?.fuzzyThreshold || DEFAULT_FUZZY_THRESHOLD;
            return new SearchService(indexManager, fuzzyThreshold);
          },
          inject: [IndexManager, SEEKER_MODULE_OPTIONS],
        },
        {
          provide: SuggestionService,
          useFactory: (indexManager: IndexManager, moduleOptions: SeekerModuleOptions) => {
            const fuzzyThreshold = moduleOptions.search?.fuzzyThreshold || DEFAULT_FUZZY_THRESHOLD;
            return new SuggestionService(indexManager, fuzzyThreshold);
          },
          inject: [IndexManager, SEEKER_MODULE_OPTIONS],
        },
        FacetService,
        SeekerService,
      ],
      exports: [SeekerService],
      global: true,
    };
  }

  private static createStorageAdapter(options: SeekerModuleOptions): StorageAdapter {
    const storageType = options.storage?.type || DEFAULT_STORAGE_TYPE;
    const storageOptions = options.storage?.options || {};

    switch (storageType) {
      case 'memory':
        return new InMemoryAdapter(storageOptions);
      case 'filesystem':
        return new FileSystemAdapter(storageOptions);
      case 's3':
        return new S3Adapter(storageOptions);
      case 'gcs':
        return new GCSAdapter(storageOptions);
      case 'azure':
        return new AzureBlobAdapter(storageOptions);
      case 'redis':
        return new RedisAdapter(storageOptions);
      default:
        throw new Error(`Unsupported storage type: ${storageType}`);
    }
  }
}
