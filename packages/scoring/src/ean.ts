/**
 * EAN-13 / EAN-8 barcodes (PLAN.md 3.2 products.barcode). We only ever store codes with a valid
 * check digit — a typo would silently point at the wrong product.
 */

/** Digits only; a 12-digit UPC-A becomes its EAN-13 form (leading 0), as iOS reports it. */
export function normalizeEan(input: string): string {
  const digits = input.replace(/[\s-]/g, '');
  return /^\d{12}$/.test(digits) ? `0${digits}` : digits;
}

export function isValidEan(input: string): boolean {
  const code = normalizeEan(input);
  if (!/^(\d{8}|\d{13})$/.test(code)) return false;
  const digits = [...code].map(Number);
  const check = digits.pop()!;
  // weights 3,1,3,1… from the right, excluding the check digit
  const sum = digits.reverse().reduce((acc, d, i) => acc + d * (i % 2 === 0 ? 3 : 1), 0);
  return (10 - (sum % 10)) % 10 === check;
}
