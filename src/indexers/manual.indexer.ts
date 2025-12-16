import { Indexer } from '../interfaces/indexer.interface';
import { Document, FieldConfig } from '../types';

export class ManualIndexer implements Indexer {
  async index(_indexName: string, _document: Document): Promise<void> {
    // This is a placeholder - actual indexing is handled by IndexService
    throw new Error('ManualIndexer.index should not be called directly. Use IndexService instead.');
  }

  async indexBatch(_indexName: string, _documents: Document[]): Promise<void> {
    // This is a placeholder - actual indexing is handled by IndexService
    throw new Error(
      'ManualIndexer.indexBatch should not be called directly. Use IndexService instead.',
    );
  }

  async remove(_indexName: string, _documentId: string): Promise<void> {
    // This is a placeholder - actual removal is handled by IndexService
    throw new Error(
      'ManualIndexer.remove should not be called directly. Use IndexService instead.',
    );
  }

  async update(_indexName: string, _document: Document): Promise<void> {
    // This is a placeholder - actual update is handled by IndexService
    throw new Error(
      'ManualIndexer.update should not be called directly. Use IndexService instead.',
    );
  }

  getFieldConfig(_entity: any): Record<string, FieldConfig> {
    // Manual indexer doesn't use decorators, so return empty config
    // Users can provide field config when indexing
    return {};
  }
}
