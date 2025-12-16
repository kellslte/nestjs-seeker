export type StorageType = 'memory' | 'filesystem' | 's3' | 'gcs' | 'azure' | 'redis';
export type AnalyzerType = 'standard' | 'simple' | 'whitespace';
export type CompressionType = 'gzip' | 'brotli';

export interface Document {
  id: string;
  fields: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface IndexMetadata {
  name: string;
  createdAt: Date;
  updatedAt: Date;
  documentCount: number;
  fieldConfig: Record<string, FieldConfig>;
  analyzer: AnalyzerType;
}

export interface FieldConfig {
  weight?: number;
  facet?: boolean;
  searchable?: boolean;
  analyzer?: AnalyzerType;
}

export interface InvertedIndex {
  [term: string]: {
    [documentId: string]: {
      field: string;
      frequency: number;
      positions: number[];
    };
  };
}

export interface IndexData {
  documents: Map<string, Document>;
  invertedIndex: InvertedIndex;
  metadata: IndexMetadata;
}
