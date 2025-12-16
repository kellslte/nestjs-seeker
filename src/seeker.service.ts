import { Injectable, Inject } from '@nestjs/common';
import { SEEKER_MODULE_OPTIONS } from './constants';
import { SeekerModuleOptions } from './interfaces/module.interface';
import { IndexService } from './services/index.service';
import { SearchService } from './services/search.service';
import { FacetService } from './services/facet.service';
import { SuggestionService } from './services/suggestion.service';

@Injectable()
export class SeekerService {
  public readonly index: IndexService;
  public readonly search: SearchService;
  public readonly facet: FacetService;
  public readonly suggestion: SuggestionService;

  constructor(
    @Inject(SEEKER_MODULE_OPTIONS) private readonly options: SeekerModuleOptions,
    indexService: IndexService,
    searchService: SearchService,
    facetService: FacetService,
    suggestionService: SuggestionService,
  ) {
    this.index = indexService;
    this.search = searchService;
    this.facet = facetService;
    this.suggestion = suggestionService;
  }

  /**
   * Get the current configuration
   */
  getConfig(): SeekerModuleOptions {
    return { ...this.options };
  }

  /**
   * Check if the service is properly configured
   */
  isConfigured(): boolean {
    return !!(this.options.storage && this.options.storage.type);
  }
}

