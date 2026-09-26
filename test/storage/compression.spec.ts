import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as zlib from 'zlib';
import { FileSystemAdapter } from '../../src/storage/file-system.adapter';
import { IndexData } from '../../src/types';

const sample = (): IndexData => ({
  documents: new Map([['1', { id: '1', fields: { t: 'hello' } } as any]]),
  invertedIndex: {},
  metadata: {
    name: 'idx',
    createdAt: new Date(),
    updatedAt: new Date(),
    documentCount: 1,
    fieldConfig: {},
    analyzer: 'standard',
  },
});

describe('storage compression', () => {
  let dir: string;
  beforeEach(() => (dir = fs.mkdtempSync(path.join(os.tmpdir(), 'seeker-'))));
  afterEach(() => fs.rmSync(dir, { recursive: true }));

  const settings = [
    { compression: false },
    { compression: true, compressionType: 'gzip' as const },
    { compression: true, compressionType: 'brotli' as const },
  ];

  it.each(settings)('round-trips with %j', async (opts) => {
    const adapter = new FileSystemAdapter({ path: dir, ...opts });
    await adapter.write('idx', sample());
    expect((await adapter.read('idx'))!.documents.get('1')!.fields.t).toBe('hello');
  });

  it('writes real brotli, not gzip', async () => {
    await new FileSystemAdapter({ path: dir, compressionType: 'brotli' }).write('idx', sample());
    const raw = fs.readFileSync(path.join(dir, 'idx.seeker'));
    expect(JSON.parse(zlib.brotliDecompressSync(raw).toString()).metadata.name).toBe('idx');
  });

  it.each(settings)('reads data written under any other setting (%j)', async (readOpts) => {
    for (const writeOpts of settings) {
      await new FileSystemAdapter({ path: dir, ...writeOpts }).write('idx', sample());
      const data = await new FileSystemAdapter({ path: dir, ...readOpts }).read('idx');
      expect(data!.metadata.name).toBe('idx');
    }
  });
});
