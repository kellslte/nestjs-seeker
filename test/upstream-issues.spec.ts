import { IndexManager } from '../src/index-manager';
import { IndexService } from '../src/services/index.service';
import { SearchService } from '../src/services/search.service';
import { QueryParser } from '../src/engine/query.parser';
import { InMemoryAdapter } from '../src/storage/in-memory.adapter';

const doc = (id: string, fields: Record<string, any>) => ({ id, fields }) as any;
const ids = (res: { results: { document: { id: string } }[] }) =>
  res.results.map((r) => r.document.id);

describe('upstream issues', () => {
  it('keeps accented and non-Latin letters', () => {
    expect(new QueryParser().parse('Café, niño 日本語!')).toEqual(['café', 'niño', '日本語']);
    expect(new QueryParser('simple').parse('crème-brûlée')).toEqual(['crème', 'brûlée']);
  });

  it('fuzzy matches words inside long fields, exact and with typos', async () => {
    const manager = new IndexManager(new InMemoryAdapter());
    await manager.addDocument('idx', doc('1', { title: 'Webhook retries explained' }), {});
    await manager.addDocument('idx', doc('2', { title: 'Billing overview' }), {});
    const search = new SearchService(manager);

    for (const query of ['webhook', 'webhok', 'retries']) {
      expect(ids(await search.search({ indexName: 'idx', query, fuzzy: true }))).toEqual(['1']);
    }
    const res = await search.search({ indexName: 'idx', query: 'webhok', fuzzy: true });
    expect(res.results[0].highlights.title).toEqual(['Webhook']);
  });

  it('shared mode sees writes from another process', async () => {
    const adapter = new InMemoryAdapter();
    const api = new IndexManager(adapter, 'standard', true);
    const worker = new IndexManager(adapter, 'standard', true);

    await api.addDocument('idx', doc('1', { t: 'first' }), {});
    await worker.addDocument('idx', doc('2', { t: 'second' }), {});
    await new IndexService(api).indexBatch('idx', [doc('3', { t: 'third' }), doc('4', { t: 'x' })]);

    expect(
      ids(
        await new SearchService(worker).search({ indexName: 'idx', query: 'first third' }),
      ).sort(),
    ).toEqual(['1', '3']);
    expect((await api.loadIndex('idx'))!.documents.size).toBe(4);
  });
});
