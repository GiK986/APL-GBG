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

const MODEL_IMAGE_EXTENSIONS = ['jpg', 'JPG', 'jpeg', 'JPEG', 'png', 'PNG'];

export function resolveModelImagePath(modelsDir: string, modelCode: string): string | null {
  for (const ext of MODEL_IMAGE_EXTENSIONS) {
    const candidate = path.join(modelsDir, `${modelCode}.${ext}`);
    if (existsSync(candidate)) return candidate;
  }
  return null;
}

export function findModelImagePath(modelCode: string): string | null {
  const modelsDir = process.env.MODEL_IMAGES_DIR;
  if (!modelsDir) return null;
  // Reject path-traversal attempts (.. or path separators)
  if (modelCode.includes('..') || modelCode.includes('/') || modelCode.includes('\\')) {
    return null;
  }
  return resolveModelImagePath(modelsDir, modelCode);
}
