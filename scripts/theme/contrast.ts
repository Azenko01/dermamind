/**
 * WCAG 2.1 contrast for the app's colour tokens (apps/mobile/src/theme/tokens.ts). Pure, so the
 * check runs in Vitest without React Native.
 */
export function parseColor(c: string): { r: number; g: number; b: number; a: number } {
  const hex = /^#([0-9a-f]{6})$/i.exec(c);
  if (hex) {
    const n = parseInt(hex[1]!, 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255, a: 1 };
  }
  const rgba = /^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)$/i.exec(c);
  if (rgba) {
    return { r: +rgba[1]!, g: +rgba[2]!, b: +rgba[3]!, a: rgba[4] === undefined ? 1 : +rgba[4] };
  }
  throw new Error(`Unsupported colour ${c}`);
}

/** A translucent colour painted over an opaque one. */
export function over(top: string, bottom: string): string {
  const t = parseColor(top);
  const b = parseColor(bottom);
  const mix = (x: number, y: number) => Math.round(x * t.a + y * (1 - t.a));
  const hex = (n: number) => n.toString(16).padStart(2, '0');
  return `#${hex(mix(t.r, b.r))}${hex(mix(t.g, b.g))}${hex(mix(t.b, b.b))}`;
}

function luminance(c: string): number {
  const { r, g, b } = parseColor(c);
  const ch = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * ch(r) + 0.7152 * ch(g) + 0.0722 * ch(b);
}

export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}
