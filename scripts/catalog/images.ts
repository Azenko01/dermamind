/**
 * Our own product photos in data/images/ — pure helpers for `pnpm catalog:attach-images`.
 *
 * File name = what the photo is of:
 *   5901234123457.jpg   EAN-13 (or EAN-8) of a catalogue product
 *   id-42.jpg / 42.jpg  product id (when the product has no barcode)
 * Anything after "-" or "_" is free (a new version: 5901234123457-v2.jpg, id-42_tyl.jpg).
 */
import { isValidEan } from '@dermamind/scoring';

/** Same rule the API uses to serve a file (apps/api/src/product-images). */
export const IMAGE_FILE = /^[A-Za-z0-9_-]{1,64}\.(jpe?g|png|webp)$/i;

export type ImageTarget = { kind: 'ean'; ean: string } | { kind: 'id'; id: number };

export function imageTarget(file: string): ImageTarget | null {
  if (!IMAGE_FILE.test(file)) return null;
  const stem = file.replace(/\.[^.]+$/, '');
  const ean = /^(\d{8}|\d{13})(?:[-_].*)?$/.exec(stem)?.[1];
  if (ean && isValidEan(ean)) return { kind: 'ean', ean };
  const id = /^(?:id-)?(\d{1,7})(?:[-_].*)?$/i.exec(stem);
  return id ? { kind: 'id', id: Number(id[1]) } : null;
}

/** The real format from the first bytes — the extension alone can lie. */
export function imageType(head: Uint8Array): 'jpeg' | 'png' | 'webp' | null {
  if (head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff) return 'jpeg';
  if ([0x89, 0x50, 0x4e, 0x47].every((b, i) => head[i] === b)) return 'png';
  const ascii = (from: number, to: number) => String.fromCharCode(...head.slice(from, to));
  if (ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP') return 'webp';
  return null;
}

export function extensionMatches(file: string, type: 'jpeg' | 'png' | 'webp'): boolean {
  const ext = file.split('.').pop()!.toLowerCase();
  return type === 'jpeg' ? ext === 'jpg' || ext === 'jpeg' : ext === type;
}
