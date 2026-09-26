import { IndexManager } from '../src/index-manager';
import { IndexService } from '../src/services/index.service';
import { InMemoryAdapter } from '../src/storage/in-memory.adapter';

const doc = (id: string, fields: Record<string, any>) => ({ id, fields }) as any;

describe('IndexManager', () => {
  it('indexBatch writes to storage once and persists every document', async () => {
    const adapter = new InMemoryAdapter();
    const write = vi.spyOn(adapter, 'write');
    const manager = new IndexManager(adapter);

    await new IndexService(manager).indexBatch('idx', [doc('1', { t: 'a' }), doc('2', { t: 'b' })]);

    // One write from implicit createIndex, one for the batch
    expect(write).toHaveBeenCalledTimes(2);
    expect((await adapter.read('idx'))!.documents.size).toBe(2);
  });

  it('removeDocument drops its postings and empty terms', async () => {
    const manager = new IndexManager(new InMemoryAdapter());
    await manager.addDocument('idx', doc('1', { t: 'shared only1' }), {});
    await manager.addDocument('idx', doc('2', { t: 'shared' }), {});

    await manager.removeDocument('idx', '1');

    const index = manager.getIndex('idx')!.invertedIndex;
    expect(index.only1).toBeUndefined();
    expect(Object.keys(index.shared)).toEqual(['2']);
  });

  it('updateDocument removes old terms even when the caller mutated the document', async () => {
    const manager = new IndexManager(new InMemoryAdapter());
    const d = doc('1', { t: 'before' });
    await manager.addDocument('idx', d, {});

    d.fields.t = 'after';
    await manager.updateDocument('idx', d, {});

    const index = manager.getIndex('idx')!.invertedIndex;
    expect(index.before).toBeUndefined();
    expect(index.after['1']).toBeDefined();
  });
});
