import { describe, it, expect } from 'vitest';
import { getDictionary, getLanguageId, DEFAULT_LID } from './i18n';

describe('getLanguageId', () => {
  it('defaults to Bulgarian (32) when lid is missing', () => {
    expect(getLanguageId(undefined)).toBe(DEFAULT_LID);
    expect(DEFAULT_LID).toBe('32');
  });

  it('returns English (4) only when lid is exactly "4"', () => {
    expect(getLanguageId('4')).toBe('4');
    expect(getLanguageId('32')).toBe('32');
    expect(getLanguageId('garbage')).toBe('32');
  });
});

describe('getDictionary', () => {
  it('returns Bulgarian strings by default', () => {
    expect(getDictionary(undefined).searchButton).toBe('Търси');
  });

  it('returns English strings for lid=4', () => {
    expect(getDictionary('4').searchButton).toBe('Search');
  });
});
