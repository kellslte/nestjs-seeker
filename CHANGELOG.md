# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [3.3.0] - 2026-09-27

### Features
- enhance indexing and search capabilities


## [Unreleased]

### Features
- `storage.shared: true` re-reads indexes from storage on every access, for multiple processes on shared Redis/S3/etc. Concurrent writers are still last-writer-wins.

### Bug Fixes
- `fuzzy: true` now matches query words against indexed words, so exact and near-miss words match, and no longer scans raw field text of every document
- the standard and simple analyzers keep accented and non-Latin letters (é, ñ, 日本語). Re-index existing data to make such text searchable.
- `getIndexInfo` loads the index from storage instead of failing when it isn't cached yet

## [3.1.0] - 2026-09-26

### Features
- support NestJS 12 and switch tests from Jest to Vitest


## [3.0.0] - 2026-09-26

See "Upgrading from 2.x" in the README.

### Security
- Fix prototype pollution: words such as `__proto__` in indexed documents could write to `Object.prototype`
- Fix path traversal: index names such as `../x` could read or write files outside the storage directory

### Breaking Changes
- index names containing /, \ or null bytes, or longer than 200 characters, are rejected with INVALID_INDEX_NAME
- the InvertedIndex type is now term -> document -> field -> { frequency, positions }; 2.x indexes load automatically but should be rebuilt
- move cloud SDKs to optional peer dependencies and support NestJS 11
- @aws-sdk/client-s3, @google-cloud/storage, @azure/storage-blob and ioredis are no longer installed automatically; install the one for your storage type
- replace pako with zlib and remove unused indexer classes
- the Indexer interface is no longer exported, and ManualIndexer, DecoratorIndexer and BaseService are removed

### Features
- enhance document handling and persistence

### Bug Fixes
- remove stale postings and validate index names before caching
- search returns results for documents indexed without decorators or field config
- word counts are kept per field, so words appearing in several fields score correctly
- `compressionType: 'brotli'` now uses brotli instead of silently using gzip
- `fuzzyThreshold: 0` is honoured
- the module-level `indexes.analyzer` option applies to new indexes

### Performance
- `indexBatch` saves to storage once instead of after every document (5,000 documents: 374 s to 0.5 s)
- search only scores documents containing a query word (one search over 5,000 documents: 417 ms to 34 ms)

### Chores
- categorize scoped commits and BREAKING CHANGE footers in changelog
- update CHANGELOG and add CLAUDE documentation


## [2.0.0] - 2025-12-16

### Chores

- Add ESLint and Prettier configuration files for code quality enforcement

## [Unreleased]

### Features

- Initial release of @scwar/nestjs-seeker
- Multiple storage strategies (in-memory, file-system, cloud)
- Full-text search with BM25 relevance scoring
- Fuzzy matching with typo tolerance
- Faceted search and filtering
- Autocomplete and suggestions
- Decorator-based entity indexing
- Compression support for file and cloud storage
- Support for AWS S3, Google Cloud Storage, Azure Blob Storage, and Redis
