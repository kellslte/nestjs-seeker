# @scwar/nestjs-seeker

A comprehensive NestJS search package that provides intelligent local/cloud indexing and search capabilities similar to Elasticsearch, Meilisearch, and Algolia.

## Features

- **Multiple Storage Strategies**: In-memory, file-system, and cloud storage (AWS S3, Google Cloud Storage, Azure Blob Storage, Redis)
- **Intelligent Search**: Full-text search with BM25 relevance scoring, fuzzy matching, faceted search, and autocomplete
- **Database Agnostic**: Works with any database via decorators
- **NestJS Native**: Decorator-based configuration, dependency injection, and lifecycle hooks integration
- **Compression**: Automatic compression for file-based and cloud storage operations

## Installation

```bash
npm install @scwar/nestjs-seeker
```

Requires NestJS 10, 11 or 12. NestJS 12 is ESM-only; from a CommonJS app it needs Node 20.19+ or 22.12+, which can `require()` ES modules. The package has no runtime dependencies of its own.

Cloud storage SDKs are optional peer dependencies and are **not installed automatically**. Install the one for the storage type you use:

```bash
# AWS S3
npm install @aws-sdk/client-s3

# Google Cloud Storage
npm install @google-cloud/storage

# Azure Blob Storage
npm install @azure/storage-blob

# Redis
npm install ioredis
```

## Quick Start

### 1. Import the Module

```typescript
import { Module } from '@nestjs/common';
import { SeekerModule } from '@scwar/nestjs-seeker';

@Module({
  imports: [
    SeekerModule.forRoot({
      storage: {
        type: 'filesystem',
        options: {
          path: './indexes',
        },
      },
      indexes: {
        analyzer: 'standard',
      },
      search: {
        fuzzyThreshold: 2,
        maxResults: 100,
        minScore: 0.1,
      },
    }),
  ],
})
export class AppModule {}
```

### 2. Define Your Entity

```typescript
import { Indexable, Searchable } from '@scwar/nestjs-seeker';

@Indexable('products')
export class Product {
  id: string;

  @Searchable({ weight: 2.0 })
  name: string;

  @Searchable({ weight: 1.0 })
  description: string;

  @Searchable({ facet: true })
  category: string;

  price: number;
}
```

### 3. Use the Service

```typescript
import { Injectable } from '@nestjs/common';
import { SeekerService } from '@scwar/nestjs-seeker';

@Injectable()
export class ProductService {
  constructor(private readonly seeker: SeekerService) {}

  async indexProduct(product: Product) {
    await this.seeker.index.index('products', {
      id: product.id,
      fields: {
        name: product.name,
        description: product.description,
        category: product.category,
        price: product.price,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    }, product);
  }

  async searchProducts(query: string) {
    return await this.seeker.search.search({
      query,
      indexName: 'products',
      limit: 20,
      fuzzy: true,
    });
  }
}
```

## Configuration

### Storage Options

#### In-Memory Storage
```typescript
storage: {
  type: 'memory',
}
```

#### File System Storage
```typescript
storage: {
  type: 'filesystem',
  options: {
    path: './indexes',
    compression: true,
    compressionType: 'gzip', // or 'brotli'
  },
}
```

Compression uses Node's built-in `zlib`. Stored indexes are read correctly whatever compression setting they were written with.

#### AWS S3 Storage
```typescript
storage: {
  type: 's3',
  options: {
    bucket: 'my-bucket',
    region: 'us-east-1',
    credentials: {
      accessKeyId: 'your-access-key',
      secretAccessKey: 'your-secret-key',
    },
  },
}
```

#### Google Cloud Storage
```typescript
storage: {
  type: 'gcs',
  options: {
    bucket: 'my-bucket',
  },
}
```

#### Azure Blob Storage
```typescript
storage: {
  type: 'azure',
  options: {
    connectionString: 'your-connection-string',
    bucket: 'my-container',
  },
}
```

#### Redis Storage
```typescript
storage: {
  type: 'redis',
  options: {
    connectionString: 'redis://localhost:6379',
  },
}
```

## API Reference

### SeekerService

The main service that provides access to all search capabilities.

#### Index Operations

```typescript
// Create an index
await seeker.index.createIndex({
  name: 'products',
  analyzer: 'standard',
});

// Index a document
await seeker.index.index('products', document, entity);

// Index multiple documents (saves to storage once, so prefer it for bulk loads)
await seeker.index.indexBatch('products', documents, entities);

// Update a document
await seeker.index.update('products', document, entity);

// Remove a document
await seeker.index.remove('products', documentId);

// Delete an index
await seeker.index.deleteIndex('products');

// Get index info
const info = await seeker.index.getIndexInfo('products');

// List all indexes
const indexes = await seeker.index.listIndexes();
```

Index names must be 1–200 characters and may not contain `/`, `\` or null bytes, since they become file paths and storage keys. Other names are rejected with an `INVALID_INDEX_NAME` error.

Without `@Searchable` decorators or a `fieldConfig`, search covers every field in the index's documents.

#### Search Operations

```typescript
// Basic search
const results = await seeker.search.search({
  query: 'laptop',
  indexName: 'products',
  limit: 20,
});

// Search with filters
const results = await seeker.search.search({
  query: 'laptop',
  indexName: 'products',
  filters: {
    category: 'electronics',
  },
  facets: ['category', 'brand'],
  fuzzy: true,
});
```

#### Facet Operations

```typescript
// Get facets
const facets = await seeker.facet.getFacets('products', ['category', 'brand']);

// Filter by facets
const documentIds = await seeker.facet.filterByFacets('products', {
  category: 'electronics',
});
```

#### Suggestion Operations

```typescript
// Get suggestions
const suggestions = await seeker.suggestion.suggest({
  query: 'lap',
  indexName: 'products',
  field: 'name',
  limit: 10,
});
```

## Decorators

### @Indexable(indexName: string)

Marks a class as indexable. The index name is used to identify the index where documents of this type will be stored.

### @Searchable(options?: SearchableOptions)

Marks a field as searchable with optional configuration:

- `weight`: Field weight for relevance scoring (default: 1.0)
- `facet`: Whether the field should be used for faceted search (default: false)
- `searchable`: Whether the field is searchable (default: true)
- `analyzer`: Text analyzer type (default: 'standard')

## Upgrading from 2.x

- **Install your storage SDK yourself.** `@aws-sdk/client-s3`, `@google-cloud/storage`, `@azure/storage-blob` and `ioredis` are no longer installed with the package.
- **Index names can't contain `/`, `\` or null bytes**, and are limited to 200 characters.
- **The `InvertedIndex` type changed** from `term → document → { field, … }` to `term → document → field → { frequency, positions }`. Indexes saved by 2.x load automatically, but rebuild them to fix term counts for words that appeared in more than one field.
- **Removed exports:** the `Indexer` interface. `ManualIndexer`, `DecoratorIndexer` and `BaseService` are also gone if you deep-imported them.

## License

MIT

