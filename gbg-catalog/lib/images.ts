import { existsSync } from 'node:fs';
import path from 'node:path';

export function resolveImagePath(partsDir: string, barcode: string): string {
  const prefix = barcode.slice(0, 4);
  return path.join(partsDir, prefix, `${barcode}.jpg`);
}

export function findImagePath(barcode: string): string | null {
  const partsDir = process.env.PARTS_DIR;
  if (!partsDir) return null;
  // Reject path-traversal attempts (.. or path separators)
  if (barcode.includes('..') || barcode.includes('/') || barcode.includes('\\')) {
    return null;
  }
  const fullPath = resolveImagePath(partsDir, barcode);
  return existsSync(fullPath) ? fullPath : null;
}
