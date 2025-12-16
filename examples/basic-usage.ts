import { Module } from '@nestjs/common';
import { SeekerModule, SeekerService, Indexable, Searchable } from '@scwar/nestjs-seeker';

// Example entity with decorators
@Indexable('products')
class Product {
  id: string;

  @Searchable({ weight: 2.0 })
  name: string;

  @Searchable({ weight: 1.0 })
  description: string;

  @Searchable({ facet: true })
  category: string;

  price: number;

  constructor(data: Partial<Product>) {
    Object.assign(this, data);
  }
}

@Module({
  imports: [
    SeekerModule.forRoot({
      storage: {
        type: 'filesystem',
        options: {
          path: './indexes',
        },
      },
      indexes: {
        analyzer: 'standard',
      },
      search: {
        fuzzyThreshold: 2,
        maxResults: 100,
        minScore: 0.1,
      },
      autoIndex: true,
    }),
  ],
})
export class AppModule {}

// Example usage in a service
export class ProductService {
  constructor(private readonly seeker: SeekerService) {}

  async indexProduct(product: Product) {
    await this.seeker.index.index('products', {
      id: product.id,
      fields: {
        name: product.name,
        description: product.description,
        category: product.category,
        price: product.price,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    }, product);
  }

  async searchProducts(query: string) {
    return await this.seeker.search.search({
      query,
      indexName: 'products',
      limit: 20,
      fuzzy: true,
    });
  }

  async getFacets() {
    return await this.seeker.facet.getFacets('products', ['category']);
  }

  async getSuggestions(query: string) {
    return await this.seeker.suggestion.suggest({
      query,
      indexName: 'products',
      field: 'name',
      limit: 10,
    });
  }
}

