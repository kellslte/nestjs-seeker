import { Indexer } from '../interfaces/indexer.interface';
import { Document, FieldConfig } from '../types';

const INDEXABLE_METADATA_KEY = 'seeker:indexable';
const SEARCHABLE_METADATA_KEY = 'seeker:searchable';

export interface IndexableMetadata {
  indexName: string;
}

export interface SearchableMetadata {
  weight?: number;
  facet?: boolean;
  searchable?: boolean;
  analyzer?: string;
}

export function getIndexableMetadata(target: any): IndexableMetadata | null {
  return Reflect.getMetadata(INDEXABLE_METADATA_KEY, target) || null;
}

export function getSearchableMetadata(target: any, propertyKey: string): SearchableMetadata | null {
  return Reflect.getMetadata(SEARCHABLE_METADATA_KEY, target, propertyKey) || null;
}

export class DecoratorIndexer implements Indexer {
  async index(indexName: string, document: Document): Promise<void> {
    // This is a placeholder - actual indexing is handled by IndexService
    throw new Error('DecoratorIndexer.index should not be called directly. Use IndexService instead.');
  }

  async indexBatch(indexName: string, documents: Document[]): Promise<void> {
    // This is a placeholder - actual indexing is handled by IndexService
    throw new Error('DecoratorIndexer.indexBatch should not be called directly. Use IndexService instead.');
  }

  async remove(indexName: string, documentId: string): Promise<void> {
    // This is a placeholder - actual removal is handled by IndexService
    throw new Error('DecoratorIndexer.remove should not be called directly. Use IndexService instead.');
  }

  async update(indexName: string, document: Document): Promise<void> {
    // This is a placeholder - actual update is handled by IndexService
    throw new Error('DecoratorIndexer.update should not be called directly. Use IndexService instead.');
  }

  getFieldConfig(entity: any): Record<string, FieldConfig> {
    const config: Record<string, FieldConfig> = {};
    const prototype = Object.getPrototypeOf(entity);
    
    // Get all property keys from the entity
    const propertyKeys = [
      ...Object.keys(entity),
      ...Object.getOwnPropertyNames(prototype),
    ];

    propertyKeys.forEach((key) => {
      if (key === 'constructor') {
        return;
      }

      const metadata = getSearchableMetadata(prototype.constructor, key);
      if (metadata) {
        config[key] = {
          weight: metadata.weight,
          facet: metadata.facet,
          searchable: metadata.searchable !== false,
          analyzer: metadata.analyzer as any,
        };
      }
    });

    return config;
  }
}

