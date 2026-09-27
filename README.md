# Trailhead 🥾

A full-stack web app for discovering, reviewing and sharing hiking trails.

Built as a portfolio project with a deliberately small dependency footprint: the only runtime dependency is **Express**. The database is Node's built-in SQLite module, and the frontend is plain HTML, CSS and JavaScript with no build step.

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/iaroslaviskendirov-alt/trailhead)

## Features

- **Browse trails.** Search as you type, filter by difficulty and region, and sort by rating, length, elevation, newest or name.
- **Trail pages** show key stats and reviews. Each trail gets a procedurally generated mountain illustration.
- **Reviews** use a star-rating input. The average rating updates immediately.
- **Trail submission** has a validated form. Server-side validation errors are shown on the matching fields.
- The layout is **responsive**, supports **dark mode** automatically and respects reduced-motion settings.
- The REST API has input validation, rate limiting on write endpoints and a central error handler.
- **Automated API tests** use the built-in `node:test` runner.

## Tech stack

| Layer    | Tech |
|----------|------|
| Backend  | Node.js 22+, Express 5 |
| Database | SQLite via `node:sqlite` (no native build needed) |
| Frontend | Vanilla JS (ES modules), hash-based router, CSS custom properties |
| Tests    | `node:test` + `fetch` against an in-memory database |

## Getting started

Requires **Node.js 22.13 or newer**.

```bash
npm install
npm start
```

Then open http://localhost:3000.

The first start creates `data/trailhead.db` and seeds it with demo trails. Delete that file to reset the data.

```bash
npm run dev   # restart automatically on file changes
npm test      # run the API test suite
```

Environment variables:

- `PORT`: HTTP port (default `3000`).
- `DB_FILE`: path to the SQLite file.
- `TRUST_PROXY`: set to `1` when running behind a reverse proxy, so rate limiting sees the real client IP.

## Deployment

The repo includes a [`render.yaml`](render.yaml) blueprint. Click **Deploy to Render** above, or create a Blueprint in the Render dashboard from this repository.

On Render's free plan the filesystem is not persistent, so the database is re-seeded with demo data after each redeploy or restart. This is fine for a demo. For persistent data, attach a disk and point `DB_FILE` at it.

## API

| Method | Endpoint                   | Description |
|--------|----------------------------|-------------|
| GET    | `/api/trails`              | List trails. Query: `q`, `difficulty` (`easy`/`moderate`/`hard`), `region`, `sort` (`rating`/`newest`/`length`/`elevation`/`name`) |
| GET    | `/api/trails/:id`          | Trail details with its reviews |
| POST   | `/api/trails`              | Create a trail |
| POST   | `/api/trails/:id/reviews`  | Add a review (`author`, `rating` 1–5, `comment`) |
| GET    | `/api/stats`               | Totals plus the list of regions |
| GET    | `/api/health`              | Health check |

When validation fails, the API returns `400` with the error for each field:

```json
{ "error": "Validation failed", "fields": { "rating": "rating must be between 1 and 5" } }
```

## Project structure

```
server/
  index.js      – entry point (starts HTTP server)
  app.js        – Express app factory + routes
  db.js         – schema, connection, seeding
  seed.js       – demo data
  validate.js   – request validation
public/
  index.html    – app shell
  styles.css    – design system + layout
  app.js        – SPA: router, views, API client
tests/
  api.test.js   – integration tests
```
