import * as pako from 'pako';
import { CompressionType } from '../types';

export class CompressionUtil {
  static compress(data: string, type: CompressionType = 'gzip', level: number = 6): Buffer {
    const input = Buffer.from(data, 'utf-8');
    
    if (type === 'gzip') {
      const compressed = pako.gzip(input, { level });
      return Buffer.from(compressed);
    } else if (type === 'brotli') {
      // pako doesn't support brotli, so we'll use gzip as fallback
      // In production, you might want to use a brotli library
      const compressed = pako.gzip(input, { level });
      return Buffer.from(compressed);
    }
    
    throw new Error(`Unsupported compression type: ${type}`);
  }

  static decompress(data: Buffer, type: CompressionType = 'gzip'): string {
    if (type === 'gzip' || type === 'brotli') {
      // For now, treat brotli as gzip since pako doesn't support brotli
      const decompressed = pako.ungzip(data);
      return Buffer.from(decompressed).toString('utf-8');
    }
    
    throw new Error(`Unsupported compression type: ${type}`);
  }

  static isCompressed(data: Buffer): boolean {
    // Check for gzip magic number: 0x1f 0x8b
    return data.length >= 2 && data[0] === 0x1f && data[1] === 0x8b;
  }
}

