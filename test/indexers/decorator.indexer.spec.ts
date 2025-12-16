import { DecoratorIndexer, getIndexableMetadata, getSearchableMetadata } from '../../src/indexers/decorator.indexer';
import { Indexable } from '../../src/decorators/indexable.decorator';
import { Searchable } from '../../src/decorators/searchable.decorator';

@Indexable('test-index')
class TestEntity {
  @Searchable({ weight: 2.0 })
  name: string;

  @Searchable({ weight: 1.0, facet: true })
  category: string;

  @Searchable({ searchable: false })
  secret: string;

  normalField: string;
}

describe('DecoratorIndexer', () => {
  let indexer: DecoratorIndexer;

  beforeEach(() => {
    indexer = new DecoratorIndexer();
  });

  it('should be defined', () => {
    expect(indexer).toBeDefined();
  });

  it('should get indexable metadata', () => {
    const metadata = getIndexableMetadata(TestEntity);
    expect(metadata).toBeDefined();
    expect(metadata?.indexName).toBe('test-index');
  });

  it('should get searchable metadata', () => {
    const nameMetadata = getSearchableMetadata(TestEntity.prototype.constructor, 'name');
    expect(nameMetadata).toBeDefined();
    expect(nameMetadata?.weight).toBe(2.0);

    const categoryMetadata = getSearchableMetadata(TestEntity.prototype.constructor, 'category');
    expect(categoryMetadata).toBeDefined();
    expect(categoryMetadata?.facet).toBe(true);
  });

  it('should get field config from entity', () => {
    const entity = new TestEntity();
    entity.name = 'Test';
    entity.category = 'Category';
    entity.secret = 'Secret';
    entity.normalField = 'Normal';

    const config = indexer.getFieldConfig(entity);
    expect(config.name).toBeDefined();
    expect(config.name.weight).toBe(2.0);
    expect(config.category).toBeDefined();
    expect(config.category.facet).toBe(true);
    expect(config.secret).toBeDefined();
    expect(config.secret.searchable).toBe(false);
    expect(config.normalField).toBeUndefined();
  });
});

