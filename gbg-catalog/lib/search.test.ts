import { describe, it, expect } from 'vitest';
import { buildSearchTerm } from './search';

describe('buildSearchTerm', () => {
  it('trims whitespace and wraps the term with % wildcards', () => {
    const { exact, like } = buildSearchTerm('  010000822  ');
    expect(exact).toBe('010000822');
    expect(like).toBe('%010000822%');
  });

  it('escapes LIKE wildcard characters so they match literally', () => {
    const { like } = buildSearchTerm('100%_off');
    expect(like).toBe('%100[%][_]off%');
  });

  it('escapes literal brackets too', () => {
    const { like } = buildSearchTerm('A[1]');
    expect(like).toBe('%A[[]1[]]%');
  });
});
