const express = require('express');
const path = require('node:path');
const { validateReview, validateTrail, DIFFICULTIES } = require('./validate');

const SORTS = {
  rating: 'avg_rating DESC, review_count DESC',
  length: 't.length_km ASC',
  elevation: 't.elevation_m DESC',
  newest: 't.created_at DESC, t.id DESC',
  name: 't.name COLLATE NOCASE ASC',
};

const TRAIL_SELECT = `
  SELECT t.*,
         ROUND(COALESCE(AVG(r.rating), 0), 1) AS avg_rating,
         COUNT(r.id)                          AS review_count
  FROM trails t
  LEFT JOIN reviews r ON r.trail_id = t.id
`;

function toTrail(row) {
  return { ...row, tags: JSON.parse(row.tags) };
}

/** Tiny fixed-window rate limiter so the public write endpoints can't be spammed. */
function rateLimit({ windowMs, max }) {
  const hits = new Map();
  return (req, res, next) => {
    const now = Date.now();
    const entry = hits.get(req.ip);
    if (!entry || now - entry.start > windowMs) {
      hits.set(req.ip, { start: now, count: 1 });
      return next();
    }
    if (++entry.count > max) {
      res.set('Retry-After', Math.ceil((entry.start + windowMs - now) / 1000));
      return res.status(429).json({ error: 'Too many requests, please slow down.' });
    }
    next();
  };
}

function parseId(req, res) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) {
    res.status(400).json({ error: 'Invalid trail id' });
    return null;
  }
  return id;
}

function createApp(db, { writeLimit = { windowMs: 60_000, max: 20 } } = {}) {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '20kb' }));

  const api = express.Router();
  const limitWrites = rateLimit(writeLimit);

  api.get('/health', (req, res) => res.json({ status: 'ok' }));

  // GET /api/trails?q=&difficulty=&region=&sort=
  api.get('/trails', (req, res) => {
    const { q, difficulty, region, sort = 'rating' } = req.query;
    const where = [];
    const params = [];

    if (typeof q === 'string' && q.trim()) {
      where.push('(t.name LIKE ? OR t.description LIKE ? OR t.tags LIKE ? OR t.region LIKE ?)');
      const like = `%${q.trim()}%`;
      params.push(like, like, like, like);
    }
    if (difficulty) {
      if (!DIFFICULTIES.includes(difficulty)) {
        return res.status(400).json({ error: `difficulty must be one of: ${DIFFICULTIES.join(', ')}` });
      }
      where.push('t.difficulty = ?');
      params.push(difficulty);
    }
    if (typeof region === 'string' && region) {
      where.push('t.region = ?');
      params.push(region);
    }
    if (!SORTS[sort]) {
      return res.status(400).json({ error: `sort must be one of: ${Object.keys(SORTS).join(', ')}` });
    }

    const sql = `${TRAIL_SELECT}
      ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
      GROUP BY t.id
      ORDER BY ${SORTS[sort]}`;

    res.json(db.prepare(sql).all(...params).map(toTrail));
  });

  api.get('/trails/:id', (req, res) => {
    const id = parseId(req, res);
    if (id === null) return;

    const row = db.prepare(`${TRAIL_SELECT} WHERE t.id = ? GROUP BY t.id`).get(id);
    if (!row) return res.status(404).json({ error: 'Trail not found' });

    const reviews = db
      .prepare('SELECT id, author, rating, comment, created_at FROM reviews WHERE trail_id = ? ORDER BY created_at DESC, id DESC')
      .all(id);

    res.json({ ...toTrail(row), reviews });
  });

  api.post('/trails', limitWrites, (req, res) => {
    const t = validateTrail(req.body);
    const hue = Math.floor(Math.random() * 360);
    const { lastInsertRowid } = db
      .prepare(`INSERT INTO trails (name, region, difficulty, length_km, elevation_m, duration_h, description, tags, hue)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(t.name, t.region, t.difficulty, t.length_km, t.elevation_m, t.duration_h, t.description, JSON.stringify(t.tags), hue);

    const created = db.prepare(`${TRAIL_SELECT} WHERE t.id = ? GROUP BY t.id`).get(lastInsertRowid);
    res.status(201).location(`/api/trails/${lastInsertRowid}`).json(toTrail(created));
  });

  api.post('/trails/:id/reviews', limitWrites, (req, res) => {
    const id = parseId(req, res);
    if (id === null) return;

    const exists = db.prepare('SELECT 1 FROM trails WHERE id = ?').get(id);
    if (!exists) return res.status(404).json({ error: 'Trail not found' });

    const r = validateReview(req.body);
    const { lastInsertRowid } = db
      .prepare('INSERT INTO reviews (trail_id, author, rating, comment) VALUES (?, ?, ?, ?)')
      .run(id, r.author, r.rating, r.comment);

    const review = db.prepare('SELECT id, author, rating, comment, created_at FROM reviews WHERE id = ?').get(lastInsertRowid);
    res.status(201).json(review);
  });

  api.get('/stats', (req, res) => {
    const totals = db.prepare(`
      SELECT COUNT(*) AS trails,
             ROUND(COALESCE(SUM(length_km), 0), 1) AS total_km,
             COUNT(DISTINCT region) AS regions
      FROM trails`).get();
    const { reviews } = db.prepare('SELECT COUNT(*) AS reviews FROM reviews').get();
    const regionList = db.prepare('SELECT DISTINCT region FROM trails ORDER BY region').all().map((r) => r.region);
    res.json({ ...totals, reviews, regionList });
  });

  api.use((req, res) => res.status(404).json({ error: 'Not found' }));

  app.use('/api', api);
  app.use(express.static(path.join(__dirname, '..', 'public')));

  // Centralised error handler: validation errors, bad JSON, and everything else.
  app.use((err, req, res, next) => {
    if (err.errors) return res.status(400).json({ error: err.message, fields: err.errors });
    if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Malformed JSON body' });
    if (err.type === 'entity.too.large') return res.status(413).json({ error: 'Request body too large' });
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}

module.exports = { createApp };
