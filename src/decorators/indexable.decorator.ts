import { IndexableMetadata } from '../indexers/decorator.indexer';

const INDEXABLE_METADATA_KEY = 'seeker:indexable';

export function Indexable(indexName: string) {
  return function (target: any) {
    const metadata: IndexableMetadata = {
      indexName,
    };
    Reflect.defineMetadata(INDEXABLE_METADATA_KEY, metadata, target);
  };
}
