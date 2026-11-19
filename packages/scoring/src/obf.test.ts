import { describe, expect, it } from 'vitest';
import { normalizeObfProduct, obfCategory, obfImportSkipReason } from './obf';

const base = {
  code: '5900116020006',
  product_name: 'Crème hydratante',
  product_name_pl: 'Krem nawilżający',
  product_name_en: 'Moisturising cream',
  brands: 'Ziaja, Ziaja Ltd',
  image_front_url: 'https://images.openbeautyfacts.org/images/products/590/front_pl.3.400.jpg',
  ingredients_text: 'Eau, Glycérine',
  ingredients_text_en: 'Aqua, Glycerin',
  countries_tags: ['en:poland', 'en:germany'],
  categories_tags: ['en:face', 'en:facial-creams'],
  last_modified_t: 1733735675,
};

describe('normalizeObfProduct', () => {
  it('prefers Polish, then English names and ingredient lists', () => {
    const p = normalizeObfProduct(base)!;
    expect(p).toMatchObject({
      ean: '5900116020006',
      name: 'Krem nawilżający',
      brand: 'Ziaja',
      inciRaw: 'Aqua, Glycerin',
      isEu: true,
      isPolishMarket: true,
      category: 'moisturizer',
      sourceUrl: 'https://world.openbeautyfacts.org/product/5900116020006',
    });
    expect(p.lastModified?.toISOString()).toBe('2024-12-09T09:14:35.000Z');
  });

  it('falls back to the main-language fields', () => {
    const p = normalizeObfProduct({
      ...base,
      product_name_pl: '  ',
      product_name_en: undefined,
      ingredients_text_en: '',
    })!;
    expect(p.name).toBe('Crème hydratante');
    expect(p.inciRaw).toBe('Eau, Glycérine');
  });

  it('ignores names without letters', () => {
    const p = normalizeObfProduct({ ...base, product_name_pl: '0', product_name_en: '-' })!;
    expect(p.name).toBe('Crème hydratante');
    expect(
      normalizeObfProduct({
        ...base,
        product_name_pl: '0',
        product_name_en: '',
        product_name: '12',
      })!.name,
    ).toBe('');
  });

  it('rejects codes with a wrong check digit and turns UPC-A into EAN-13', () => {
    expect(normalizeObfProduct({ ...base, code: '5900116020007' })).toBeNull();
    expect(normalizeObfProduct({ ...base, code: 'abc' })).toBeNull();
    expect(normalizeObfProduct({ ...base, code: '036000291452' })?.ean).toBe('0036000291452');
  });

  it('keeps only OBF image links', () => {
    expect(
      normalizeObfProduct({ ...base, image_front_url: 'http://evil.example/x.jpg' })?.imageUrl,
    ).toBeNull();
  });
});

describe('obfImportSkipReason', () => {
  it('needs ingredients, an EU country and a name', () => {
    expect(obfImportSkipReason(normalizeObfProduct(base))).toBeNull();
    expect(obfImportSkipReason(null)).toBe('invalid_ean');
    expect(
      obfImportSkipReason(
        normalizeObfProduct({
          ...base,
          ingredients_text: '',
          ingredients_text_en: '',
          ingredients_text_pl: '',
        }),
      ),
    ).toBe('no_ingredients');
    expect(
      obfImportSkipReason(normalizeObfProduct({ ...base, countries_tags: ['en:united-states'] })),
    ).toBe('not_eu');
    expect(
      obfImportSkipReason(
        normalizeObfProduct({
          ...base,
          product_name: '',
          product_name_pl: '',
          product_name_en: '',
        }),
      ),
    ).toBe('no_name');
  });
});

describe('obfCategory', () => {
  it('maps clear face-care tags', () => {
    expect(obfCategory(['en:face', 'en:Face serums'])).toBe('serum');
    expect(obfCategory(['en:micellar-water'])).toBe('cleanser');
    expect(obfCategory(['en:in-sun-protections', 'en:sunscreen'])).toBe('sunscreen');
    expect(obfCategory(['en:face-masks'])).toBe('mask');
    expect(obfCategory(['en:eye-contour-creams'])).toBe('eye_cream');
  });

  it('gives products that are not face care their own category', () => {
    expect(obfCategory(['en:hygiene', 'en:toothpastes'])).toBe('oral_care');
    expect(obfCategory(['en:mouthwash'])).toBe('oral_care');
    expect(obfCategory(['en:hygiene', 'en:deodorants', 'en:roll-on-deodorants'])).toBe('deodorant');
    expect(obfCategory(['en:face', 'en:makeup', 'en:face-makeup', 'en:foundations'])).toBe(
      'makeup',
    );
    expect(obfCategory(['en:lip-cosmetics'])).toBe('makeup');
    expect(obfCategory(['en:hair', 'en:shampoos'])).toBe('hair_care');
    expect(obfCategory(['en:hair', 'en:hair-serum'])).toBe('hair_care');
    expect(obfCategory(['en:hygiene', 'en:shower-gels', 'en:cleansers'])).toBe('body_care');
    expect(obfCategory(['en:body', 'en:body-milks'])).toBe('body_care');
    expect(obfCategory(['en:soaps'])).toBe('body_care');
  });

  it('leaves unclear products as other', () => {
    expect(obfCategory(['en:open-beauty-facts'])).toBe('other');
    expect(obfCategory([])).toBe('other');
  });
});
