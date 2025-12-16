export class SeekerError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
    public readonly statusCode?: number,
  ) {
    super(message);
    this.name = 'SeekerError';
    Object.setPrototypeOf(this, SeekerError.prototype);
  }
}

export class IndexNotFoundError extends SeekerError {
  constructor(indexName: string) {
    super(`Index "${indexName}" not found`, 'INDEX_NOT_FOUND', 404);
    this.name = 'IndexNotFoundError';
    Object.setPrototypeOf(this, IndexNotFoundError.prototype);
  }
}

export class DocumentNotFoundError extends SeekerError {
  constructor(documentId: string) {
    super(`Document "${documentId}" not found`, 'DOCUMENT_NOT_FOUND', 404);
    this.name = 'DocumentNotFoundError';
    Object.setPrototypeOf(this, DocumentNotFoundError.prototype);
  }
}

export class StorageError extends SeekerError {
  public readonly cause?: Error;

  constructor(message: string, cause?: Error) {
    super(message, 'STORAGE_ERROR', 500);
    this.name = 'StorageError';
    if (cause) {
      (this as any).cause = cause;
    }
    Object.setPrototypeOf(this, StorageError.prototype);
  }
}
