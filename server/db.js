const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');
const fs = require('node:fs');
const seed = require('./seed');

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS trails (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT    NOT NULL,
    region      TEXT    NOT NULL,
    difficulty  TEXT    NOT NULL CHECK (difficulty IN ('easy', 'moderate', 'hard')),
    length_km   REAL    NOT NULL CHECK (length_km > 0),
    elevation_m INTEGER NOT NULL CHECK (elevation_m >= 0),
    duration_h  REAL    NOT NULL CHECK (duration_h > 0),
    description TEXT    NOT NULL,
    tags        TEXT    NOT NULL DEFAULT '[]',
    hue         INTEGER NOT NULL DEFAULT 150,
    created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS reviews (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    trail_id   INTEGER NOT NULL REFERENCES trails(id) ON DELETE CASCADE,
    author     TEXT    NOT NULL,
    rating     INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment    TEXT    NOT NULL,
    created_at TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_reviews_trail ON reviews(trail_id);
`;

/**
 * Opens (or creates) the database, applies the schema and seeds demo data
 * when the trails table is empty. Pass ':memory:' for tests.
 */
function openDatabase(file = path.join(__dirname, '..', 'data', 'trailhead.db')) {
  if (file !== ':memory:') fs.mkdirSync(path.dirname(file), { recursive: true });

  const db = new DatabaseSync(file);
  db.exec('PRAGMA foreign_keys = ON;');
  db.exec(SCHEMA);

  const { count } = db.prepare('SELECT COUNT(*) AS count FROM trails').get();
  if (count === 0) seedDatabase(db);

  return db;
}

function seedDatabase(db) {
  const insertTrail = db.prepare(`
    INSERT INTO trails (name, region, difficulty, length_km, elevation_m, duration_h, description, tags, hue)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertReview = db.prepare(`
    INSERT INTO reviews (trail_id, author, rating, comment, created_at)
    VALUES (?, ?, ?, ?, datetime('now', ?))
  `);

  db.exec('BEGIN');
  try {
    for (const t of seed.trails) {
      const { lastInsertRowid } = insertTrail.run(
        t.name, t.region, t.difficulty, t.length_km, t.elevation_m,
        t.duration_h, t.description, JSON.stringify(t.tags), t.hue
      );
      for (const r of t.reviews) {
        insertReview.run(lastInsertRowid, r.author, r.rating, r.comment, `-${r.daysAgo} days`);
      }
    }
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}

module.exports = { openDatabase };
