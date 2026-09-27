const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { openDatabase } = require('../server/db');
const { createApp } = require('../server/app');

let server;
let base;

before(async () => {
  const app = createApp(openDatabase(':memory:'), { writeLimit: { windowMs: 60_000, max: 5 } });
  await new Promise((resolve) => { server = app.listen(0, resolve); });
  base = `http://localhost:${server.address().port}/api`;
});

after(() => server.close());

const get = (path) => fetch(base + path);
const post = (path, body) =>
  fetch(base + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

test('GET /trails returns seeded trails with aggregated ratings', async () => {
  const res = await get('/trails');
  assert.equal(res.status, 200);
  const trails = await res.json();
  assert.ok(trails.length >= 8);
  assert.ok(Array.isArray(trails[0].tags));
  assert.equal(typeof trails[0].avg_rating, 'number');
  // default sort = top rated
  for (let i = 1; i < trails.length; i++) assert.ok(trails[i - 1].avg_rating >= trails[i].avg_rating);
});

test('GET /trails filters by difficulty and search', async () => {
  const hard = await (await get('/trails?difficulty=hard')).json();
  assert.ok(hard.length > 0 && hard.every((t) => t.difficulty === 'hard'));

  const waterfall = await (await get('/trails?q=waterfall')).json();
  assert.ok(waterfall.some((t) => t.name === 'Lantern Falls Trail'));
});

test('GET /trails rejects unknown sort and difficulty', async () => {
  assert.equal((await get('/trails?sort=bogus')).status, 400);
  assert.equal((await get('/trails?difficulty=extreme')).status, 400);
});

test('GET /trails/:id returns reviews, 404 for missing, 400 for bad id', async () => {
  const trail = await (await get('/trails/1')).json();
  assert.ok(Array.isArray(trail.reviews) && trail.reviews.length > 0);
  assert.equal((await get('/trails/9999')).status, 404);
  assert.equal((await get('/trails/abc')).status, 400);
});

test('POST /trails/:id/reviews validates and updates the average', async () => {
  const bad = await post('/trails/4/reviews', { author: 'x', rating: 9, comment: '' });
  assert.equal(bad.status, 400);
  const { fields } = await bad.json();
  assert.deepEqual(Object.keys(fields).sort(), ['author', 'comment', 'rating']);

  const res = await post('/trails/4/reviews', { author: 'Tester', rating: 2, comment: 'Windy but fine.' });
  assert.equal(res.status, 201);
  const review = await res.json();
  assert.equal(review.author, 'Tester');

  const trail = await (await get('/trails/4')).json();
  assert.equal(trail.review_count, 2);
  assert.equal(trail.avg_rating, 3); // (4 + 2) / 2
});

test('POST /trails creates a trail and normalises tags', async () => {
  const res = await post('/trails', {
    name: 'Test Peak',
    region: 'Nowhere',
    difficulty: 'moderate',
    length_km: '7.5',
    elevation_m: 400,
    duration_h: 3,
    description: 'A test trail used by the automated test-suite.',
    tags: 'Lake Views, lake views, forest',
  });
  assert.equal(res.status, 201);
  const trail = await res.json();
  assert.equal(trail.length_km, 7.5);
  assert.deepEqual(trail.tags, ['lake-views', 'forest']);
  assert.equal(res.headers.get('location'), `/api/trails/${trail.id}`);
});

test('POST /trails rejects invalid difficulty and malformed JSON', async () => {
  const res = await post('/trails', { name: 'Nope', difficulty: 'insane' });
  assert.equal(res.status, 400);
  assert.ok((await res.json()).fields.difficulty);

  const malformed = await fetch(base + '/trails', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{oops' });
  assert.equal(malformed.status, 400);
});

test('write endpoints are rate limited', async () => {
  let last;
  for (let i = 0; i < 6; i++) last = await post('/trails/1/reviews', {});
  assert.equal(last.status, 429);
});

test('unknown API routes return JSON 404', async () => {
  const res = await get('/nope');
  assert.equal(res.status, 404);
  assert.deepEqual(await res.json(), { error: 'Not found' });
});
