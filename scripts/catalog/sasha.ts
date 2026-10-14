import { readFileSync } from 'node:fs';

/**
 * Parser for Sa.Sha's original database (data/final_db.sql). It's a hand-written SQL file with a
 * fixed layout, so a few regular expressions are enough — no need to run it in a real database.
 */
export interface SashaProduct {
  name: string;
  brand: string;
  category: string;
  price: number | null;
  url: string;
  /** Partial INCI: only the key ingredients, with their real position in the full list. */
  ingredients: { name: string; position: number }[];
}

export interface SashaEffect {
  ingredient: string;
  problem: string;
  effect: 'good' | 'bad';
}

export interface SashaDb {
  products: SashaProduct[];
  ingredients: string[];
  problems: string[];
  effects: SashaEffect[];
}

const unquote = (s: string) => s.trim().replace(/^'|'$/g, '').replace(/''/g, "'");

export function parseSashaSql(sql: string): SashaDb {
  const productsBlock = between(sql, /INSERT INTO products\s*\([^)]*\)\s*VALUES/, ';');
  const products: SashaProduct[] = [];
  for (const m of productsBlock.matchAll(
    /\(\s*('(?:[^']|'')*')\s*,\s*('(?:[^']|'')*')\s*,\s*('(?:[^']|'')*')\s*,\s*([\d.]+|NULL)\s*,\s*('(?:[^']|'')*')\s*\)/g,
  )) {
    products.push({
      name: unquote(m[1]!),
      brand: unquote(m[2]!),
      category: unquote(m[3]!),
      price: m[4] === 'NULL' ? null : Number(m[4]),
      url: unquote(m[5]!),
      ingredients: [],
    });
  }

  const ingredientsBlock = between(sql, /INSERT INTO ingredients \(name\) VALUES/, ';');
  const ingredients = [...ingredientsBlock.matchAll(/\('((?:[^']|'')*)'\)/g)].map((m) =>
    unquote(m[1]!),
  );

  const problemsBlock = between(sql, /INSERT INTO skin_problems \(name\) VALUES/, ';');
  const problems = [...problemsBlock.matchAll(/\('((?:[^']|'')*)'\)/g)].map((m) => unquote(m[1]!));

  // product_ingredients: VALUES ('Name', 3), ... ) AS x(...) ... ON p.name = 'Product'
  for (const m of sql.matchAll(
    /INSERT INTO product_ingredients[\s\S]*?VALUES([\s\S]*?)\)\s*AS x\(name, ingredient_order\)[\s\S]*?ON p\.name = ('(?:[^']|'')*')/g,
  )) {
    const product = products.find((p) => p.name === unquote(m[2]!));
    if (!product) throw new Error(`product_ingredients for unknown product ${m[2]}`);
    for (const row of m[1]!.matchAll(/\(\s*('(?:[^']|'')*')\s*,\s*(\d+)\s*\)/g)) {
      product.ingredients.push({ name: unquote(row[1]!), position: Number(row[2]) });
    }
  }

  const effectsBlock = between(sql, /INSERT INTO ingredient_effects[\s\S]*?VALUES/, 'AS x(');
  const effects: SashaEffect[] = [];
  for (const m of effectsBlock.matchAll(
    /\(\s*('(?:[^']|'')*')\s*,\s*('(?:[^']|'')*')\s*,\s*'(good|bad)'\s*\)/g,
  )) {
    effects.push({
      ingredient: unquote(m[1]!),
      problem: unquote(m[2]!),
      effect: m[3] as 'good' | 'bad',
    });
  }

  return { products, ingredients, problems, effects };
}

export function readSashaDb(path: string): SashaDb {
  return parseSashaSql(readFileSync(path, 'utf8'));
}

function between(text: string, start: RegExp, end: string): string {
  const m = start.exec(text);
  if (!m) throw new Error(`Section not found: ${start}`);
  const from = m.index + m[0].length;
  const to = text.indexOf(end, from);
  return text.slice(from, to === -1 ? undefined : to);
}
