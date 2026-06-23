import { describe, it, expect } from 'vitest';
import { parsePage } from './pagination';

describe('parsePage', () => {
  it('defaults to 1 when the param is missing', () => {
    expect(parsePage(undefined)).toBe(1);
  });

  it('defaults to 1 for non-numeric input', () => {
    expect(parsePage('abc')).toBe(1);
  });

  it('defaults to 1 for zero', () => {
    expect(parsePage('0')).toBe(1);
  });

  it('defaults to 1 for negative numbers', () => {
    expect(parsePage('-5')).toBe(1);
  });

  it('floors fractional values', () => {
    expect(parsePage('1.5')).toBe(1);
  });

  it('defaults to 1 for Infinity', () => {
    expect(parsePage('Infinity')).toBe(1);
  });

  it('returns the parsed integer for a normal valid page', () => {
    expect(parsePage('3')).toBe(3);
  });
});
