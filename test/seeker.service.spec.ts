import { Test, TestingModule } from '@nestjs/testing';
import { SeekerService } from '../src/seeker.service';
import { SeekerModuleOptions } from '../src/interfaces/module.interface';
import { SEEKER_MODULE_OPTIONS } from '../src/constants';
import { IndexService } from '../src/services/index.service';
import { SearchService } from '../src/services/search.service';
import { FacetService } from '../src/services/facet.service';
import { SuggestionService } from '../src/services/suggestion.service';
import { IndexManager } from '../src/index-manager';
import { InMemoryAdapter } from '../src/storage/in-memory.adapter';

describe('SeekerService', () => {
  let service: SeekerService;
  let moduleOptions: SeekerModuleOptions;

  beforeEach(async () => {
    moduleOptions = {
      storage: {
        type: 'memory',
      },
    };

    const storage = new InMemoryAdapter();
    const indexManager = new IndexManager(storage);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: SEEKER_MODULE_OPTIONS,
          useValue: moduleOptions,
        },
        {
          provide: IndexManager,
          useValue: indexManager,
        },
        IndexService,
        {
          provide: SearchService,
          useFactory: (indexManager: IndexManager) => {
            return new SearchService(indexManager, 2);
          },
          inject: [IndexManager],
        },
        FacetService,
        {
          provide: SuggestionService,
          useFactory: (indexManager: IndexManager) => {
            return new SuggestionService(indexManager, 2);
          },
          inject: [IndexManager],
        },
        SeekerService,
      ],
    }).compile();

    service = module.get<SeekerService>(SeekerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should have index service', () => {
    expect(service.index).toBeDefined();
  });

  it('should have search service', () => {
    expect(service.search).toBeDefined();
  });

  it('should have facet service', () => {
    expect(service.facet).toBeDefined();
  });

  it('should have suggestion service', () => {
    expect(service.suggestion).toBeDefined();
  });

  it('should return config', () => {
    const config = service.getConfig();
    expect(config).toBeDefined();
    expect(config.storage.type).toBe('memory');
  });

  it('should check if configured', () => {
    expect(service.isConfigured()).toBe(true);
  });
});

