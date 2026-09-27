import { StorageType, AnalyzerType } from '../types';
import { StorageOptions } from './storage.interface';

export interface SeekerModuleOptions {
  storage: {
    type: StorageType;
    options?: StorageOptions;
    /** Other processes write the same storage: re-read indexes from storage on every access */
    shared?: boolean;
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
