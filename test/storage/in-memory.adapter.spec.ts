import { InMemoryAdapter } from '../../src/storage/in-memory.adapter';
import { IndexData, IndexMetadata } from '../../src/types';

describe('InMemoryAdapter', () => {
  let adapter: InMemoryAdapter;

  beforeEach(() => {
    adapter = new InMemoryAdapter();
  });

  it('should be defined', () => {
    expect(adapter).toBeDefined();
  });

  it('should write and read index', async () => {
    const indexName = 'test-index';
    const metadata: IndexMetadata = {
      name: indexName,
      createdAt: new Date(),
      updatedAt: new Date(),
      documentCount: 0,
      fieldConfig: {},
      analyzer: 'standard',
    };

    const indexData: IndexData = {
      documents: new Map(),
      invertedIndex: {},
      metadata,
    };

    await adapter.write(indexName, indexData);
    const result = await adapter.read(indexName);

    expect(result).toBeDefined();
    expect(result?.metadata.name).toBe(indexName);
  });

  it('should return null for non-existent index', async () => {
    const result = await adapter.read('non-existent');
    expect(result).toBeNull();
  });

  it('should check if index exists', async () => {
    const indexName = 'test-index';
    const metadata: IndexMetadata = {
      name: indexName,
      createdAt: new Date(),
      updatedAt: new Date(),
      documentCount: 0,
      fieldConfig: {},
      analyzer: 'standard',
    };

    const indexData: IndexData = {
      documents: new Map(),
      invertedIndex: {},
      metadata,
    };

    expect(await adapter.exists(indexName)).toBe(false);
    await adapter.write(indexName, indexData);
    expect(await adapter.exists(indexName)).toBe(true);
  });

  it('should delete index', async () => {
    const indexName = 'test-index';
    const metadata: IndexMetadata = {
      name: indexName,
      createdAt: new Date(),
      updatedAt: new Date(),
      documentCount: 0,
      fieldConfig: {},
      analyzer: 'standard',
    };

    const indexData: IndexData = {
      documents: new Map(),
      invertedIndex: {},
      metadata,
    };

    await adapter.write(indexName, indexData);
    expect(await adapter.exists(indexName)).toBe(true);
    
    await adapter.delete(indexName);
    expect(await adapter.exists(indexName)).toBe(false);
  });

  it('should list indexes', async () => {
    const indexName1 = 'test-index-1';
    const indexName2 = 'test-index-2';
    const metadata: IndexMetadata = {
      name: indexName1,
      createdAt: new Date(),
      updatedAt: new Date(),
      documentCount: 0,
      fieldConfig: {},
      analyzer: 'standard',
    };

    const indexData: IndexData = {
      documents: new Map(),
      invertedIndex: {},
      metadata,
    };

    await adapter.write(indexName1, indexData);
    await adapter.write(indexName2, { ...indexData, metadata: { ...metadata, name: indexName2 } });

    const list = await adapter.list();
    expect(list).toContain(indexName1);
    expect(list).toContain(indexName2);
  });
});

