import { SearchableMetadata } from '../indexers/decorator.indexer';

const SEARCHABLE_METADATA_KEY = 'seeker:searchable';

export interface SearchableOptions {
  weight?: number;
  facet?: boolean;
  searchable?: boolean;
  analyzer?: 'standard' | 'simple' | 'whitespace';
}

export function Searchable(options: SearchableOptions = {}) {
  return function (target: any, propertyKey: string) {
    const metadata: SearchableMetadata = {
      weight: options.weight,
      facet: options.facet,
      searchable: options.searchable !== false,
      analyzer: options.analyzer,
    };
    Reflect.defineMetadata(SEARCHABLE_METADATA_KEY, metadata, target, propertyKey);
  };
}

