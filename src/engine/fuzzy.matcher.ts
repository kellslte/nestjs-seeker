export class FuzzyMatcher {
  private threshold: number;

  constructor(threshold: number = 2) {
    this.threshold = threshold;
  }

  levenshteinDistance(str1: string, str2: string): number {
    const len1 = str1.length;
    const len2 = str2.length;
    const matrix: number[][] = [];

    for (let i = 0; i <= len1; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= len2; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= len1; i++) {
      for (let j = 1; j <= len2; j++) {
        if (str1[i - 1] === str2[j - 1]) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j - 1] + 1,
          );
        }
      }
    }

    return matrix[len1][len2];
  }

  isMatch(term: string, query: string): boolean {
    if (term === query) {
      return true;
    }

    const distance = this.levenshteinDistance(term, query);
    const maxLength = Math.max(term.length, query.length);
    
    if (maxLength === 0) {
      return true;
    }

    const similarity = 1 - distance / maxLength;
    return distance <= this.threshold;
  }

  findMatches(terms: string[], query: string): string[] {
    const queryLower = query.toLowerCase();
    return terms.filter((term) => this.isMatch(term.toLowerCase(), queryLower));
  }

  calculateSimilarity(str1: string, str2: string): number {
    const distance = this.levenshteinDistance(str1, str2);
    const maxLength = Math.max(str1.length, str2.length);
    
    if (maxLength === 0) {
      return 1;
    }

    return 1 - distance / maxLength;
  }
}

