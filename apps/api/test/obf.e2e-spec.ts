import { createServer, type IncomingHttpHeaders, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import { PrismaService } from '../src/prisma/prisma.service';
import { auth, createTestApp, registerUser, resetDb, sampleQuiz } from './helpers';

/** valid check digits; each one drives a different answer of the mock Open Beauty Facts server */
const LOCAL = '5901234123457';
const OBF_FULL = '4006381333931';
const OBF_NO_INCI = '3600523614417';
const OBF_MISSING = '8710103907312';
const OBF_SLOW = '5000112548167';

interface Hit {
  url: string;
  headers: IncomingHttpHeaders;
}

/** Stand-in for world.openbeautyfacts.org — real HTTP, so the client's URL, headers and timeout are tested. */
function startObfMock(): Promise<{ server: Server; url: string; hits: Hit[] }> {
  const hits: Hit[] = [];
  const server = createServer((req, res) => {
    hits.push({ url: req.url ?? '', headers: req.headers });
    const ean = /\/api\/v2\/product\/(\d+)\.json/.exec(req.url ?? '')?.[1];
    const json = (status: number, body: unknown) => {
      res.writeHead(status, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(body));
    };
    if (ean === OBF_FULL) {
      return json(200, {
        status: 1,
        product: {
          code: ean,
          product_name: 'Sérum apaisant',
          product_name_pl: 'Serum kojące',
          brands: 'Beta Labs, Beta',
          image_front_url:
            'https://images.openbeautyfacts.org/images/products/400/front_pl.4.400.jpg',
          ingredients_text_pl: 'Aqua, Niacinamide, Mystery Extract',
          countries_tags: ['en:poland'],
          categories_tags: ['en:face', 'en:face-serums'],
          last_modified_t: 1733735675,
        },
      });
    }
    if (ean === OBF_NO_INCI) {
      return json(200, {
        status: 1,
        product: {
          code: ean,
          product_name: 'Krem bez składu',
          brands: 'Gamma',
          image_front_url:
            'https://images.openbeautyfacts.org/images/products/360/front_en.3.400.jpg',
          countries_tags: ['en:france'],
        },
      });
    }
    if (ean === OBF_SLOW) {
      setTimeout(() => json(200, { status: 1, product: { code: ean } }), 2000);
      return;
    }
    return json(404, { status: 0, status_verbose: 'product not found' });
  });
  return new Promise((resolve) =>
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address() as AddressInfo;
      resolve({ server, url: `http://127.0.0.1:${port}`, hits });
    }),
  );
}

async function seed(prisma: PrismaService) {
  const breakouts = await prisma.skinConcern.findUniqueOrThrow({ where: { code: 'breakouts' } });
  const aqua = await prisma.ingredient.create({
    data: { inciName: 'AQUA', displayName: 'Aqua', aliases: { create: [{ alias: 'aqua' }] } },
  });
  const niacinamide = await prisma.ingredient.create({
    data: {
      inciName: 'NIACINAMIDE',
      displayName: 'Niacinamide',
      functions: ['skin_conditioning'],
      aliases: { create: [{ alias: 'niacinamide' }] },
      effects: { create: { concernId: breakouts.id, effect: 2 } },
    },
  });
  const product = await prisma.product.create({
    data: {
      name: 'Calm Serum',
      category: 'serum',
      barcode: LOCAL,
      inciComplete: true,
      ingredients: { create: [{ ingredientId: aqua.id, position: 1 }] },
    },
  });
  return { aqua, niacinamide, product };
}

describe('barcode lookup with Open Beauty Facts fallback (e2e)', () => {
  let mock: Awaited<ReturnType<typeof startObfMock>>;
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let s: Awaited<ReturnType<typeof seed>>;
  const http = () => request(app.getHttpServer());

  beforeAll(async () => {
    mock = await startObfMock();
    process.env.OBF_API_URL = mock.url;
    process.env.OBF_TIMEOUT_MS = '300';
    ({ app, prisma } = await createTestApp());
  });
  beforeEach(async () => {
    mock.hits.length = 0;
    await resetDb(prisma);
    s = await seed(prisma);
  });
  afterAll(async () => {
    process.env.OBF_API_URL = '';
    delete process.env.OBF_TIMEOUT_MS;
    await app.close();
    await new Promise((r) => mock.server.close(r));
  });

  const quizUser = async (email = 'ola@example.com') => {
    const user = await registerUser(app, email);
    await http()
      .put('/v1/me/quiz')
      .set(auth(user.accessToken))
      .send({ ...sampleQuiz, concerns: ['breakouts'] })
      .expect(200);
    return user;
  };

  it('answers from the local database without asking Open Beauty Facts', async () => {
    const res = await http().get(`/v1/products/by-ean/${LOCAL}`).expect(200);
    expect(res.body).toMatchObject({
      id: s.product.id,
      source: 'curated',
      barcode: LOCAL,
      hasIngredientList: true,
    });
    expect(mock.hits).toHaveLength(0);
  });

  it('falls back to Open Beauty Facts, saves the product as obf and scores it', async () => {
    const user = await quizUser();
    const res = await http()
      .get(`/v1/products/by-ean/${OBF_FULL}`)
      .set(auth(user.accessToken))
      .expect(200);
    expect(res.body).toMatchObject({
      source: 'obf',
      barcode: OBF_FULL,
      name: 'Serum kojące',
      brand: 'Beta Labs',
      category: 'serum',
      isPolishMarket: true,
      hasIngredientList: true,
      inciComplete: false,
      unknownIngredients: ['MYSTERY EXTRACT'],
      sourceUrl: `https://world.openbeautyfacts.org/product/${OBF_FULL}`,
      imageUrl: expect.stringMatching(/^https:\/\/images\.openbeautyfacts\.org\//),
    });
    expect(
      res.body.ingredients.map((i: { inciName: string; position: number }) => [
        i.inciName,
        i.position,
      ]),
    ).toEqual([
      ['AQUA', 1],
      ['NIACINAMIDE', 2],
    ]);
    expect(res.body.match).toMatchObject({ status: 'ok' });

    // the request OBF saw: v2 product endpoint, only our fields, our User-Agent
    expect(mock.hits).toHaveLength(1);
    expect(mock.hits[0]!.url).toMatch(
      new RegExp(`^/api/v2/product/${OBF_FULL}\\.json\\?fields=code,`),
    );
    expect(mock.hits[0]!.headers['user-agent']).toBe('DermaMind/1.0 (diploma project)');

    // second scan: served from our database
    await http().get(`/v1/products/by-ean/${OBF_FULL}`).expect(200);
    expect(mock.hits).toHaveLength(1);
    const row = await prisma.product.findUniqueOrThrow({ where: { barcode: OBF_FULL } });
    expect(row).toMatchObject({
      source: 'obf',
      isPublished: true,
      inciUnknown: ['MYSTERY EXTRACT'],
    });

    // and the scan is in the history with the product
    const scans = await http().get('/v1/me/scans').set(auth(user.accessToken)).expect(200);
    expect(scans.body.items[0]).toMatchObject({ barcode: OBF_FULL, product: { id: row.id } });
  });

  it('returns an Open Beauty Facts record without ingredients so the app can ask for them', async () => {
    const res = await http().get(`/v1/products/by-ean/${OBF_NO_INCI}`).expect(200);
    expect(res.body).toMatchObject({
      source: 'obf',
      name: 'Krem bez składu',
      brand: 'Gamma',
      hasIngredientList: false,
      ingredients: [],
      match: null,
    });
    // can't be scored, so it stays out of search
    const list = await http().get('/v1/products').query({ q: 'bez składu' }).expect(200);
    expect(list.body.total).toBe(0);
  });

  it('answers 404 for a code nobody knows and does not ask OBF again for 24 h', async () => {
    await http().get(`/v1/products/by-ean/${OBF_MISSING}`).expect(404);
    await http().get(`/v1/products/by-ean/${OBF_MISSING}`).expect(404);
    expect(mock.hits).toHaveLength(1);

    await prisma.obfMiss.update({
      where: { barcode: OBF_MISSING },
      data: { checkedAt: new Date(Date.now() - 25 * 60 * 60 * 1000) },
    });
    await http().get(`/v1/products/by-ean/${OBF_MISSING}`).expect(404);
    expect(mock.hits).toHaveLength(2);
  });

  it('gives up after the timeout without remembering it as a miss', async () => {
    await http().get(`/v1/products/by-ean/${OBF_SLOW}`).expect(404);
    expect(await prisma.obfMiss.count()).toBe(0);
    expect(await prisma.product.count({ where: { barcode: OBF_SLOW } })).toBe(0);
  });

  it('never overwrites a hidden catalogue row that holds the code', async () => {
    await prisma.product.update({ where: { id: s.product.id }, data: { isPublished: false } });
    await http().get(`/v1/products/by-ean/${LOCAL}`).expect(404);
    expect(mock.hits).toHaveLength(0);
    expect(await prisma.product.findUniqueOrThrow({ where: { id: s.product.id } })).toMatchObject({
      source: 'curated',
      name: 'Calm Serum',
    });
  });

  describe('POST /v1/products (user product)', () => {
    it('saves the pasted list as the user’s own product, visible only to them', async () => {
      const ola = await quizUser();
      const ewa = await registerUser(app, 'ewa@example.com');
      // OBF knows the code but not the ingredients
      await http().get(`/v1/products/by-ean/${OBF_NO_INCI}`).set(auth(ola.accessToken)).expect(200);

      const created = await http()
        .post('/v1/products')
        .set(auth(ola.accessToken))
        .send({
          ean: OBF_NO_INCI,
          name: 'Krem bez składu',
          brand: 'gamma',
          inciRaw: 'Aqua, Niacinamide, Unknown Thing',
        })
        .expect(201);
      expect(created.body).toMatchObject({
        source: 'user',
        barcode: OBF_NO_INCI,
        brand: 'Gamma', // same brand, case-insensitive
        needsReview: true,
        hasIngredientList: true,
        unknownIngredients: ['UNKNOWN THING'],
        imageUrl: expect.stringMatching(/^https:\/\/images\.openbeautyfacts\.org\//),
        match: { status: 'ok' },
      });
      const id = created.body.id as number;

      // the author: their product on scan, by id and in search
      const again = await http()
        .get(`/v1/products/by-ean/${OBF_NO_INCI}`)
        .set(auth(ola.accessToken))
        .expect(200);
      expect(again.body).toMatchObject({ id, source: 'user' });
      await http().get(`/v1/products/${id}`).set(auth(ola.accessToken)).expect(200);
      const mine = await http()
        .get('/v1/products')
        .query({ q: 'składu' })
        .set(auth(ola.accessToken));
      expect(mine.body.items.map((i: { id: number }) => i.id)).toEqual([id]);

      // anyone else: still the Open Beauty Facts record, the user product is invisible
      const other = await http()
        .get(`/v1/products/by-ean/${OBF_NO_INCI}`)
        .set(auth(ewa.accessToken))
        .expect(200);
      expect(other.body).toMatchObject({ source: 'obf', hasIngredientList: false });
      await http().get(`/v1/products/${id}`).set(auth(ewa.accessToken)).expect(404);
      await http().get(`/v1/products/${id}`).expect(404);

      // sending it again updates the same product instead of adding a second one
      const updated = await http()
        .post('/v1/products')
        .set(auth(ola.accessToken))
        .send({ ean: OBF_NO_INCI, name: 'Krem poprawiony', inciRaw: 'Aqua, Niacinamide' })
        .expect(201);
      expect(updated.body).toMatchObject({ id, name: 'Krem poprawiony', inciComplete: true });
      expect(await prisma.product.count({ where: { source: 'user' } })).toBe(1);
    });

    it('works for a code nobody knows and validates the input', async () => {
      const ola = await quizUser();
      const res = await http()
        .post('/v1/products')
        .set(auth(ola.accessToken))
        .send({ ean: OBF_MISSING, name: 'Nowy tonik', inciRaw: 'Aqua' })
        .expect(201);
      expect(res.body).toMatchObject({ source: 'user', category: 'other', imageUrl: null });

      await http().post('/v1/products').send({ name: 'X krem', inciRaw: 'Aqua' }).expect(401);
      await http()
        .post('/v1/products')
        .set(auth(ola.accessToken))
        .send({ ean: '5901234123458', name: 'Zły kod', inciRaw: 'Aqua' })
        .expect(400);
      await http()
        .post('/v1/products')
        .set(auth(ola.accessToken))
        .send({ name: 'Bez składu' })
        .expect(400);
    });
  });
});

describe('barcode lookup rate limit (e2e)', () => {
  it('answers 429 after SCAN_RATE_LIMIT lookups a minute', async () => {
    process.env.SCAN_RATE_LIMIT = '2';
    const { app } = await createTestApp();
    try {
      const http = () => request(app.getHttpServer());
      await http().get(`/v1/products/by-ean/${OBF_MISSING}`).expect(404);
      await http().get(`/v1/products/by-ean/${OBF_MISSING}`).expect(404);
      await http().get(`/v1/products/by-ean/${OBF_MISSING}`).expect(429);
      // other endpoints are not affected by the scan limit
      await http().get('/v1/products').expect(200);
    } finally {
      process.env.SCAN_RATE_LIMIT = '10000';
      await app.close();
    }
  });
});
