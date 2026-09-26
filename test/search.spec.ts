import { IndexManager } from '../src/index-manager';
import { SearchService } from '../src/services/search.service';
import { InMemoryAdapter } from '../src/storage/in-memory.adapter';

const doc = (id: string, fields: Record<string, any>) => ({ id, fields }) as any;

describe('search', () => {
  it('finds documents indexed without any field config', async () => {
    const manager = new IndexManager(new InMemoryAdapter());
    await manager.addDocument('idx', doc('1', { title: 'hello world' }), {});

    const res = await new SearchService(manager).search({ indexName: 'idx', query: 'hello' });
    expect(res.results.map((r) => r.document.id)).toEqual(['1']);
  });

  it('keeps fields marked searchable: false out of the default search', async () => {
    const manager = new IndexManager(new InMemoryAdapter());
    await manager.addDocument('idx', doc('1', { title: 'a', secret: 'hello' }), {
      secret: { searchable: false },
    });

    const res = await new SearchService(manager).search({ indexName: 'idx', query: 'hello' });
    expect(res.total).toBe(0);
  });

  it('counts a term separately in each field it appears in', async () => {
    const manager = new IndexManager(new InMemoryAdapter());
    await manager.addDocument('idx', doc('1', { title: 'red', body: 'red red red' }), {
      title: {},
      body: {},
    });

    const postings = (await manager.loadIndex('idx'))!.invertedIndex.red['1'];
    expect(postings.title.frequency).toBe(1);
    expect(postings.body.frequency).toBe(3);

    const res = await new SearchService(manager).search({
      indexName: 'idx',
      query: 'red',
      fields: ['body'],
    });
    expect(res.total).toBe(1);
  });

  it('reads indexes stored in the pre-3.0 format', async () => {
    const adapter = new InMemoryAdapter();
    const legacy = JSON.stringify({
      documents: [['1', { id: '1', fields: { title: 'red' } }]],
      invertedIndex: { red: { '1': { field: 'title', frequency: 1, positions: [0] } } },
      metadata: { name: 'old', createdAt: new Date(), updatedAt: new Date(), fieldConfig: {} },
    });
    const data = (adapter as any).deserialize(legacy);

    expect(data.invertedIndex.red['1'].title).toEqual({ frequency: 1, positions: [0] });
  });
});
