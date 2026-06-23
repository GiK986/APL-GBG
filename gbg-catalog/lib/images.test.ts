import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { resolveImagePath, findImagePath } from './images';

describe('resolveImagePath', () => {
  it('builds the path from the first 4 digits of the barcode', () => {
    expect(resolveImagePath('/parts', '010000822')).toBe('/parts/0100/010000822.jpg');
  });

  it('does not throw on barcodes shorter than 4 characters', () => {
    expect(resolveImagePath('/parts', '12')).toBe('/parts/12/12.jpg');
  });
});

describe('findImagePath', () => {
  const originalEnv = process.env.PARTS_DIR;

  beforeEach(() => {
    process.env.PARTS_DIR = '/tmp/parts';
  });

  afterEach(() => {
    process.env.PARTS_DIR = originalEnv;
  });

  it('rejects barcodes with .. path traversal', () => {
    expect(findImagePath('../../etc/passwd')).toBeNull();
  });

  it('rejects barcodes with backslash path traversal', () => {
    expect(findImagePath('..\\windows\\system32')).toBeNull();
  });
});
