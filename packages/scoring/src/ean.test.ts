import { describe, expect, it } from 'vitest';
import { isValidEan, normalizeEan } from './ean';

describe('EAN', () => {
  it('accepts valid EAN-13 and EAN-8 check digits', () => {
    expect(isValidEan('4006381333931')).toBe(true);
    expect(isValidEan('5901234123457')).toBe(true);
    expect(isValidEan('96385074')).toBe(true);
  });

  it('rejects wrong check digits, lengths and letters', () => {
    expect(isValidEan('4006381333932')).toBe(false);
    expect(isValidEan('96385075')).toBe(false);
    expect(isValidEan('123')).toBe(false);
    expect(isValidEan('590123412345X')).toBe(false);
    expect(isValidEan('')).toBe(false);
  });

  it('normalises spaces, dashes and UPC-A', () => {
    expect(normalizeEan('590 1234 12345-7')).toBe('5901234123457');
    expect(normalizeEan('036000291452')).toBe('0036000291452');
    expect(isValidEan('036000291452')).toBe(true);
  });
});
