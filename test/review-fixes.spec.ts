import { IndexManager } from '../src/index-manager';
import { IndexService } from '../src/services/index.service';
import { SearchService } from '../src/services/search.service';
import { InMemoryAdapter } from '../src/storage/in-memory.adapter';

const doc = (id: string, fields: Record<string, any>) => ({ id, fields }) as any;
const termsFor = (manager: IndexManager, id: string) =>
  Object.entries(manager.getIndex('idx')!.invertedIndex)
    .filter(([, postings]) => postings[id])
    .map(([term]) => term);

describe('review fixes', () => {
  it('removes all postings for a document whose Date field reloaded as a string', async () => {
    const adapter = new InMemoryAdapter();
    await new IndexManager(adapter).addDocument('idx', doc('1', { at: new Date(0) }), {});

    const reloaded = new IndexManager(adapter); // storage round-trip turns the Date into an ISO string
    await reloaded.removeDocument('idx', '1');
    expect(termsFor(reloaded, '1')).toEqual([]);
  });

  it('re-indexing the same id replaces its old terms', async () => {
    const manager = new IndexManager(new InMemoryAdapter());
    await manager.addDocument('idx', doc('1', { t: 'old' }), {});
    await manager.addDocument('idx', doc('1', { t: 'new' }), {});
    expect(termsFor(manager, '1')).toEqual(['new']);
  });

  it('keeps per-call searchable: false fields out of the default search', async () => {
    const manager = new IndexManager(new InMemoryAdapter());
    await manager.createIndex('idx');
    await manager.addDocument('idx', doc('1', { name: 'ann', ssn: '123456789' }), {
      ssn: { searchable: false },
    });

    const res = await new SearchService(manager).search({
      indexName: 'idx',
      query: '123456780',
      fuzzy: true,
    });
    expect(res.total).toBe(0);
  });

  it('rejects bad names before caching them, and accepts names like tenant:1', async () => {
    const manager = new IndexManager(new InMemoryAdapter());
    await expect(manager.createIndex('../escaped')).rejects.toMatchObject({
      code: 'INVALID_INDEX_NAME',
    });
    expect(manager.getIndex('../escaped')).toBeNull();

    await manager.createIndex('tenant:1 products');
    expect(await manager.listIndexes()).toContain('tenant:1 products');
  });

  it('indexBatch persists documents added before a failure', async () => {
    const adapter = new InMemoryAdapter();
    const service = new IndexService(new IndexManager(adapter));

    await expect(
      service.indexBatch('idx', [doc('1', { t: 'a' }), { id: '2' } as any]),
    ).rejects.toThrow();
    expect((await adapter.read('idx'))!.documents.has('1')).toBe(true);
  });

  it('uses the module-level analyzer for implicitly created indexes', async () => {
    const manager = new IndexManager(new InMemoryAdapter(), 'whitespace');
    await manager.addDocument('idx', doc('1', { t: 'a' }), {});
    expect(manager.getIndex('idx')!.metadata.analyzer).toBe('whitespace');
  });
});
