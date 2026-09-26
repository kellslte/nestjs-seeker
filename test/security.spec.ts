import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { IndexManager } from '../src/index-manager';
import { InMemoryAdapter } from '../src/storage/in-memory.adapter';
import { FileSystemAdapter } from '../src/storage/file-system.adapter';

describe('security', () => {
  it('does not pollute Object.prototype from document text', async () => {
    const manager = new IndexManager(new InMemoryAdapter());
    const doc = { id: 'polluted', fields: { title: '__proto__ constructor' } } as any;
    await manager.addDocument('idx', doc, { title: {} });

    // Round-trip through storage deserialization too
    const reloaded = new IndexManager(manager['storage']);
    await reloaded.addDocument('idx', { ...doc, id: 'again' }, { title: {} });

    expect(({} as any).polluted).toBeUndefined();
    expect(({} as any).again).toBeUndefined();
    expect((await reloaded.loadIndex('idx'))!.invertedIndex['__proto__']['again']).toBeDefined();
  });

  it('rejects index names that escape the base directory', async () => {
    const base = fs.mkdtempSync(path.join(os.tmpdir(), 'seeker-'));
    const manager = new IndexManager(new FileSystemAdapter({ path: path.join(base, 'idx') }));

    for (const name of ['../escaped', 'a/b', '..\\x', '']) {
      await expect(manager.createIndex(name)).rejects.toThrow();
    }
    expect(fs.existsSync(path.join(base, 'escaped.seeker'))).toBe(false);

    await manager.createIndex('products.v2-en_US');
    expect(fs.existsSync(path.join(base, 'idx', 'products.v2-en_US.seeker'))).toBe(true);
    fs.rmSync(base, { recursive: true });
  });
});
