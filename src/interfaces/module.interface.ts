import { StorageType, AnalyzerType } from '../types';
import { StorageOptions } from './storage.interface';

export interface SeekerModuleOptions {
  storage: {
    type: StorageType;
    options?: StorageOptions;
  };
  indexes?: {
    defaultFields?: string[];
    analyzer?: AnalyzerType;
  };
  search?: {
    fuzzyThreshold?: number;
    maxResults?: number;
    minScore?: number;
  };
  autoIndex?: boolean;
}

