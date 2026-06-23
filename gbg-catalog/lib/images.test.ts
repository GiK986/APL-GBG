import { describe, it, expect } from 'vitest';
import { resolveImagePath } from './images';

describe('resolveImagePath', () => {
  it('builds the path from the first 4 digits of the barcode', () => {
    expect(resolveImagePath('/parts', '010000822')).toBe('/parts/0100/010000822.jpg');
  });

  it('does not throw on barcodes shorter than 4 characters', () => {
    expect(resolveImagePath('/parts', '12')).toBe('/parts/12/12.jpg');
  });
});
