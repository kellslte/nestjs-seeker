import { InvertedIndex, Document, FieldConfig } from '../types';

export class RelevanceScorer {
  private k1: number = 1.5;
  private b: number = 0.75;

  calculateBM25(
    term: string,
    documentId: string,
    field: string,
    invertedIndex: InvertedIndex,
    documents: Map<string, Document>,
    fieldConfig: Record<string, FieldConfig>,
    avgFieldLength: number,
  ): number {
    const termData = invertedIndex[term]?.[documentId];
    if (!termData || termData.field !== field) {
      return 0;
    }

    const document = documents.get(documentId);
    if (!document) {
      return 0;
    }

    const fieldValue = document.fields[field];
    if (!fieldValue) {
      return 0;
    }

    const fieldLength = String(fieldValue).length;
    const termFrequency = termData.frequency;
    const documentFrequency = Object.keys(invertedIndex[term] || {}).length;
    const totalDocuments = documents.size;

    if (totalDocuments === 0 || documentFrequency === 0) {
      return 0;
    }

    const idf = Math.log((totalDocuments - documentFrequency + 0.5) / (documentFrequency + 0.5) + 1);
    const fieldWeight = fieldConfig[field]?.weight || 1.0;
    const normalizedLength = fieldLength / avgFieldLength;
    
    const score =
      idf *
      (termFrequency * (this.k1 + 1)) /
      (termFrequency + this.k1 * (1 - this.b + this.b * normalizedLength)) *
      fieldWeight;

    return score;
  }

  calculateAvgFieldLength(
    documents: Map<string, Document>,
    field: string,
  ): number {
    if (documents.size === 0) {
      return 1;
    }

    let totalLength = 0;
    documents.forEach((doc) => {
      const fieldValue = doc.fields[field];
      if (fieldValue) {
        totalLength += String(fieldValue).length;
      }
    });

    return totalLength / documents.size || 1;
  }

  scoreDocument(
    queryTerms: string[],
    documentId: string,
    fields: string[],
    invertedIndex: InvertedIndex,
    documents: Map<string, Document>,
    fieldConfig: Record<string, FieldConfig>,
  ): number {
    let totalScore = 0;

    fields.forEach((field) => {
      const avgLength = this.calculateAvgFieldLength(documents, field);
      
      queryTerms.forEach((term) => {
        const score = this.calculateBM25(
          term,
          documentId,
          field,
          invertedIndex,
          documents,
          fieldConfig,
          avgLength,
        );
        totalScore += score;
      });
    });

    return totalScore;
  }
}

