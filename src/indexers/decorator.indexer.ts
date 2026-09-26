import { FieldConfig } from '../types';

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

export function getFieldConfig(entity: any): Record<string, FieldConfig> {
  const config: Record<string, FieldConfig> = {};
  const prototype = Object.getPrototypeOf(entity);
  const constructor = prototype.constructor;

  // Get all property keys from the entity
  const propertyKeys = [...Object.keys(entity), ...Object.getOwnPropertyNames(prototype)];

  propertyKeys.forEach((key) => {
    if (key === 'constructor') {
      return;
    }

    // Try both prototype and constructor
    let metadata = getSearchableMetadata(prototype, key);
    if (!metadata) {
      metadata = getSearchableMetadata(constructor, key);
    }

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
