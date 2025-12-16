import { FieldConfig, AnalyzerType } from '../types';

export interface IndexOptions {
  name: string;
  defaultFields?: string[];
  analyzer?: AnalyzerType;
  fieldConfig?: Record<string, FieldConfig>;
}

export interface IndexInfo {
  name: string;
  documentCount: number;
  createdAt: Date;
  updatedAt: Date;
}
