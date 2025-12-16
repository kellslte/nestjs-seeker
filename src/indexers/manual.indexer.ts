import { Indexer } from '../interfaces/indexer.interface';
import { Document, FieldConfig } from '../types';

export class ManualIndexer implements Indexer {
  async index(indexName: string, document: Document): Promise<void> {
    // This is a placeholder - actual indexing is handled by IndexService
    throw new Error('ManualIndexer.index should not be called directly. Use IndexService instead.');
  }

  async indexBatch(indexName: string, documents: Document[]): Promise<void> {
    // This is a placeholder - actual indexing is handled by IndexService
    throw new Error('ManualIndexer.indexBatch should not be called directly. Use IndexService instead.');
  }

  async remove(indexName: string, documentId: string): Promise<void> {
    // This is a placeholder - actual removal is handled by IndexService
    throw new Error('ManualIndexer.remove should not be called directly. Use IndexService instead.');
  }

  async update(indexName: string, document: Document): Promise<void> {
    // This is a placeholder - actual update is handled by IndexService
    throw new Error('ManualIndexer.update should not be called directly. Use IndexService instead.');
  }

  getFieldConfig(entity: any): Record<string, FieldConfig> {
    // Manual indexer doesn't use decorators, so return empty config
    // Users can provide field config when indexing
    return {};
  }
}

