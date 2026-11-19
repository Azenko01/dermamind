import { describe, expect, it } from 'vitest';
import { extensionMatches, imageTarget, imageType } from './images';

describe('imageTarget', () => {
  it('reads an EAN or a product id from the file name', () => {
    expect(imageTarget('5901234123457.jpg')).toEqual({ kind: 'ean', ean: '5901234123457' });
    expect(imageTarget('96385074.png')).toEqual({ kind: 'ean', ean: '96385074' });
    expect(imageTarget('id-42.webp')).toEqual({ kind: 'id', id: 42 });
    expect(imageTarget('42.jpeg')).toEqual({ kind: 'id', id: 42 });
    // a suffix marks a new version of the photo
    expect(imageTarget('5901234123457-v2.jpg')).toEqual({ kind: 'ean', ean: '5901234123457' });
    expect(imageTarget('id-42_v3.png')).toEqual({ kind: 'id', id: 42 });
  });

  it('rejects names it cannot place or the API would not serve', () => {
    expect(imageTarget('5901234123458.jpg')).toBeNull(); // wrong check digit, too long for an id
    expect(imageTarget('krem.jpg')).toBeNull();
    expect(imageTarget('42.gif')).toBeNull();
    expect(imageTarget('../42.jpg')).toBeNull();
    expect(imageTarget('id 42.jpg')).toBeNull();
  });
});

describe('imageType', () => {
  it('recognises JPEG, PNG and WebP by their first bytes', () => {
    expect(imageType(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe('jpeg');
    expect(imageType(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a]))).toBe('png');
    expect(imageType(new TextEncoder().encode('RIFF\0\0\0\0WEBPVP8 '))).toBe('webp');
    expect(imageType(new TextEncoder().encode('GIF89a'))).toBeNull();
    expect(extensionMatches('a.JPG', 'jpeg')).toBe(true);
    expect(extensionMatches('a.png', 'jpeg')).toBe(false);
  });
});
