// Trailhead frontend — a small hash-routed SPA talking to the Express API.

const app = document.getElementById('app');
const toastEl = document.getElementById('toast');

// ---------- helpers ----------

const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

async function api(path, options = {}) {
  const res = await fetch(`/api${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || `Request failed (${res.status})`);
    err.fields = data.fields;
    throw err;
  }
  return data;
}

let toastTimer;
function toast(message, type = '') {
  toastEl.textContent = message;
  toastEl.className = `toast show ${type}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (toastEl.className = 'toast'), 3000);
}

function formatDate(sqlDate) {
  const d = new Date(sqlDate.replace(' ', 'T') + 'Z');
  const days = Math.floor((Date.now() - d) / 86_400_000);
  if (days < 1) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 30) return `${days} days ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const stars = (n) => '★'.repeat(n) + '☆'.repeat(5 - n);

function ratingBadge(t) {
  if (!t.review_count) return '<span class="rating muted">No reviews yet</span>';
  return `<span class="rating"><span class="star">★</span>${t.avg_rating.toFixed(1)}
          <span class="muted">(${t.review_count})</span></span>`;
}

/** Procedural mountain landscape so every trail gets a unique cover without image assets. */
function cover(hue, seed) {
  let s = seed * 9301 + 49297;
  const rand = () => ((s = (s * 9301 + 49297) % 233280) / 233280);

  const ridge = (base, amp, steps) => {
    let d = `M0 400 L0 ${base}`;
    for (let i = 1; i <= steps; i++) {
      const x = (i / steps) * 1000;
      const y = base - rand() * amp + (i % 2 ? amp * 0.35 : 0);
      d += ` L${x.toFixed(0)} ${y.toFixed(0)}`;
    }
    return d + ' L1000 400 Z';
  };

  const sunX = 150 + rand() * 700;
  return `
    <svg class="cover" viewBox="0 0 1000 400" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id="sky${seed}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="hsl(${hue} 55% 82%)"/>
          <stop offset="1" stop-color="hsl(${(hue + 30) % 360} 60% 92%)"/>
        </linearGradient>
      </defs>
      <rect width="1000" height="400" fill="url(#sky${seed})"/>
      <circle cx="${sunX}" cy="110" r="42" fill="hsl(${(hue + 40) % 360} 80% 96%)" opacity=".9"/>
      <path d="${ridge(210, 110, 7)}" fill="hsl(${hue} 30% 66%)"/>
      <path d="${ridge(270, 90, 9)}" fill="hsl(${hue} 32% 48%)"/>
      <path d="${ridge(330, 60, 12)}" fill="hsl(${hue} 38% 30%)"/>
    </svg>`;
}

// ---------- views ----------

const state = { q: '', difficulty: '', region: '', sort: 'rating' };
let stats = null;

async function renderExplore() {
  app.innerHTML = `
    <section class="hero">
      <h1>Find the trail that fits your day.</h1>
      <p>Browse community-rated hikes, from easy waterfall strolls to full-day summit pushes. Filter by difficulty and region, read reviews, and share your own.</p>
      <div class="stats" id="stats"></div>
    </section>

    <section aria-label="Filters">
      <div class="filters">
        <div class="search">
          <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
          <input id="q" type="search" placeholder="Search trails, tags, regions…" aria-label="Search trails" value="${esc(state.q)}" />
        </div>
        <select id="region" aria-label="Region"><option value="">All regions</option></select>
        <select id="sort" aria-label="Sort by">
          <option value="rating">Top rated</option>
          <option value="newest">Newest</option>
          <option value="length">Shortest</option>
          <option value="elevation">Most elevation</option>
          <option value="name">Name A–Z</option>
        </select>
      </div>
      <div class="chips" role="group" aria-label="Difficulty">
        ${['', 'easy', 'moderate', 'hard']
          .map((d) => `<button class="chip" data-difficulty="${d}" aria-pressed="${state.difficulty === d}">${d ? d[0].toUpperCase() + d.slice(1) : 'All levels'}</button>`)
          .join('')}
      </div>
    </section>

    <p class="result-count" id="count" aria-live="polite"></p>
    <section class="grid" id="grid">${'<div class="skeleton"></div>'.repeat(6)}</section>`;

  document.getElementById('sort').value = state.sort;

  let debounce;
  document.getElementById('q').addEventListener('input', (e) => {
    clearTimeout(debounce);
    debounce = setTimeout(() => { state.q = e.target.value; loadTrails(); }, 250);
  });
  document.getElementById('sort').addEventListener('change', (e) => { state.sort = e.target.value; loadTrails(); });
  document.getElementById('region').addEventListener('change', (e) => { state.region = e.target.value; loadTrails(); });
  document.querySelectorAll('.chip').forEach((chip) =>
    chip.addEventListener('click', () => {
      state.difficulty = chip.dataset.difficulty;
      document.querySelectorAll('.chip').forEach((c) => c.setAttribute('aria-pressed', c === chip));
      loadTrails();
    })
  );

  loadStats();
  loadTrails();
}

async function loadStats() {
  try {
    stats = await api('/stats');
    const el = document.getElementById('stats');
    if (!el) return;
    el.innerHTML = [
      [stats.trails, 'trails'],
      [`${Math.round(stats.total_km)} km`, 'of paths'],
      [stats.regions, 'regions'],
      [stats.reviews, 'reviews'],
    ].map(([v, l]) => `<div class="stat"><strong>${esc(v)}</strong><span>${l}</span></div>`).join('');

    const select = document.getElementById('region');
    select.innerHTML = '<option value="">All regions</option>' +
      stats.regionList.map((r) => `<option ${r === state.region ? 'selected' : ''}>${esc(r)}</option>`).join('');
  } catch {
    /* stats are decorative; ignore failures */
  }
}

let loadId = 0;
async function loadTrails() {
  const id = ++loadId;
  const params = new URLSearchParams(Object.entries(state).filter(([, v]) => v));
  const grid = document.getElementById('grid');
  try {
    const trails = await api(`/trails?${params}`);
    if (id !== loadId || !document.getElementById('grid')) return; // stale response

    document.getElementById('count').textContent = `${trails.length} trail${trails.length === 1 ? '' : 's'} found`;
    grid.innerHTML = trails.length
      ? trails.map(card).join('')
      : `<div class="empty" style="grid-column:1/-1"><h3>No trails match those filters</h3><p>Try a different search, or <a href="#/submit">add a new trail</a>.</p></div>`;
  } catch (err) {
    grid.innerHTML = `<div class="empty" style="grid-column:1/-1"><h3>Couldn't load trails</h3><p>${esc(err.message)}</p></div>`;
  }
}

function card(t) {
  return `
    <a class="card" href="#/trail/${t.id}">
      ${cover(t.hue, t.id)}
      <div class="card-body">
        <div class="card-top">
          <h3>${esc(t.name)}</h3>
          <span class="badge ${t.difficulty}">${t.difficulty}</span>
        </div>
        <div class="card-top">
          <span class="region">${esc(t.region)}</span>
          ${ratingBadge(t)}
        </div>
        <div class="tags">${t.tags.slice(0, 3).map((tag) => `<span class="tag">#${esc(tag)}</span>`).join('')}</div>
        <div class="meta">
          <span><b>${t.length_km}</b> km</span>
          <span><b>${t.elevation_m}</b> m gain</span>
          <span><b>${t.duration_h}</b> h</span>
        </div>
      </div>
    </a>`;
}

async function renderTrail(id) {
  app.innerHTML = `<a class="back" href="#/">← All trails</a><div class="skeleton" style="height:260px"></div>`;
  let t;
  try {
    t = await api(`/trails/${id}`);
  } catch (err) {
    app.innerHTML = `<a class="back" href="#/">← All trails</a>
      <div class="empty"><h3>${esc(err.message)}</h3><p>The trail may have been moved or never existed.</p></div>`;
    return;
  }
  document.title = `${t.name} — Trailhead`;

  app.innerHTML = `
    <a class="back" href="#/">← All trails</a>
    <div class="detail-cover">${cover(t.hue, t.id)}</div>

    <div class="detail-head">
      <div>
        <span class="badge ${t.difficulty}">${t.difficulty}</span>
        <h1>${esc(t.name)}</h1>
        <span class="region">${esc(t.region)}</span>
      </div>
      <div id="trail-rating">${ratingBadge(t)}</div>
    </div>

    <div class="facts">
      <div class="fact"><span>Length</span><strong>${t.length_km} km</strong></div>
      <div class="fact"><span>Elevation gain</span><strong>${t.elevation_m} m</strong></div>
      <div class="fact"><span>Est. time</span><strong>${t.duration_h} h</strong></div>
      <div class="fact"><span>Pace</span><strong>${(t.length_km / t.duration_h).toFixed(1)} km/h</strong></div>
    </div>

    <div class="detail-layout">
      <div>
        <p class="description">${esc(t.description)}</p>
        <div class="tags">${t.tags.map((tag) => `<span class="tag">#${esc(tag)}</span>`).join('')}</div>
        <h2 class="section-title">Reviews <span class="muted" id="review-count">(${t.reviews.length})</span></h2>
        <div class="review-list" id="reviews">
          ${t.reviews.length ? t.reviews.map((r) => review(r)).join('') : '<p class="muted" id="no-reviews">Be the first to review this trail.</p>'}
        </div>
      </div>

      <aside class="panel">
        <h2>Leave a review</h2>
        <form class="form" id="review-form" novalidate>
          <div class="field" data-field="rating">
            <label id="rating-label">Your rating</label>
            <fieldset class="star-input" aria-labelledby="rating-label">
              ${[5, 4, 3, 2, 1].map((n) => `
                <input type="radio" id="star${n}" name="rating" value="${n}" />
                <label for="star${n}" title="${n} star${n > 1 ? 's' : ''}">★</label>`).join('')}
            </fieldset>
            <div class="field-error"></div>
          </div>
          <div class="field" data-field="author">
            <label for="author">Name</label>
            <input id="author" name="author" maxlength="40" autocomplete="nickname" />
            <div class="field-error"></div>
          </div>
          <div class="field" data-field="comment">
            <label for="comment">Comment</label>
            <textarea id="comment" name="comment" maxlength="600" placeholder="How were the views, the crowds, the conditions?"></textarea>
            <div class="field-error"></div>
          </div>
          <button class="btn" type="submit">Post review</button>
        </form>
      </aside>
    </div>`;

  const form = document.getElementById('review-form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form));
    if (data.rating) data.rating = Number(data.rating);
    await submitForm(form, () => api(`/trails/${t.id}/reviews`, { method: 'POST', body: JSON.stringify(data) }), async (created) => {
      document.getElementById('no-reviews')?.remove();
      document.getElementById('reviews').insertAdjacentHTML('afterbegin', review(created, true));
      form.reset();
      const fresh = await api(`/trails/${t.id}`);
      document.getElementById('trail-rating').innerHTML = ratingBadge(fresh);
      document.getElementById('review-count').textContent = `(${fresh.review_count})`;
      toast('Thanks! Your review is live.');
    });
  });
}

function review(r, isNew = false) {
  return `
    <article class="review ${isNew ? 'new' : ''}">
      <div class="review-head">
        <strong>${esc(r.author)}</strong>
        <time datetime="${esc(r.created_at)}">${formatDate(r.created_at)}</time>
      </div>
      <div class="rating"><span class="star" aria-label="${r.rating} out of 5">${stars(r.rating)}</span></div>
      <p>${esc(r.comment)}</p>
    </article>`;
}

function renderSubmit() {
  document.title = 'Add a trail — Trailhead';
  app.innerHTML = `
    <div class="submit-page">
      <a class="back" href="#/">← All trails</a>
      <h1>Share a trail</h1>
      <p>Know a hike worth sharing? Add it to the catalogue so others can find it.</p>
      <form class="form panel" id="trail-form" novalidate>
        <div class="field" data-field="name">
          <label for="name">Trail name</label>
          <input id="name" name="name" maxlength="80" placeholder="e.g. Hidden Lake Loop" />
          <div class="field-error"></div>
        </div>
        <div class="field" data-field="region">
          <label for="region-input">Region</label>
          <input id="region-input" name="region" maxlength="60" list="regions" placeholder="e.g. Cascade Highlands" />
          <datalist id="regions">${(stats?.regionList ?? []).map((r) => `<option value="${esc(r)}">`).join('')}</datalist>
          <div class="field-error"></div>
        </div>
        <div class="field" data-field="difficulty">
          <label>Difficulty</label>
          <div class="segmented">
            ${['easy', 'moderate', 'hard'].map((d) => `
              <label><input type="radio" name="difficulty" value="${d}" ${d === 'moderate' ? 'checked' : ''}/><span>${d}</span></label>`).join('')}
          </div>
          <div class="field-error"></div>
        </div>
        <div class="form-row">
          <div class="field" data-field="length_km">
            <label for="length_km">Length (km)</label>
            <input id="length_km" name="length_km" type="number" step="0.1" min="0.1" inputmode="decimal" />
            <div class="field-error"></div>
          </div>
          <div class="field" data-field="elevation_m">
            <label for="elevation_m">Elevation gain (m)</label>
            <input id="elevation_m" name="elevation_m" type="number" step="1" min="0" inputmode="numeric" />
            <div class="field-error"></div>
          </div>
          <div class="field" data-field="duration_h">
            <label for="duration_h">Duration (h)</label>
            <input id="duration_h" name="duration_h" type="number" step="0.5" min="0.1" inputmode="decimal" />
            <div class="field-error"></div>
          </div>
        </div>
        <div class="field" data-field="description">
          <label for="description">Description</label>
          <textarea id="description" name="description" maxlength="1000" placeholder="What makes this trail special? Terrain, highlights, tips…"></textarea>
          <div class="field-error"></div>
        </div>
        <div class="field" data-field="tags">
          <label for="tags">Tags</label>
          <input id="tags" name="tags" placeholder="lake, views, dog-friendly" />
          <div class="hint">Comma-separated, up to 6.</div>
          <div class="field-error"></div>
        </div>
        <button class="btn" type="submit">Publish trail</button>
      </form>
    </div>`;

  const form = document.getElementById('trail-form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form));
    await submitForm(form, () => api('/trails', { method: 'POST', body: JSON.stringify(data) }), (created) => {
      toast('Trail published!');
      location.hash = `#/trail/${created.id}`;
    });
  });
}

/** Shared submit flow: disables the button, maps server-side field errors onto the form. */
async function submitForm(form, request, onSuccess) {
  const button = form.querySelector('button[type="submit"]');
  form.querySelectorAll('.field').forEach((f) => {
    f.classList.remove('invalid');
    f.querySelector('.field-error').textContent = '';
  });
  button.disabled = true;
  try {
    await onSuccess(await request());
  } catch (err) {
    if (err.fields) {
      for (const [field, message] of Object.entries(err.fields)) {
        const el = form.querySelector(`[data-field="${field}"]`);
        if (!el) continue;
        el.classList.add('invalid');
        // Swap the API field name ("length_km") for the form's human label ("Length (km)").
        const label = el.querySelector('label')?.textContent.trim() || field;
        el.querySelector('.field-error').textContent = message.replace(field, label);
      }
      form.querySelector('.invalid input, .invalid textarea')?.focus();
      toast('Please fix the highlighted fields.', 'error');
    } else {
      toast(err.message, 'error');
    }
  } finally {
    button.disabled = false;
  }
}

// ---------- router ----------

function router() {
  const hash = location.hash || '#/';
  const trailMatch = hash.match(/^#\/trail\/(\d+)$/);

  document.querySelectorAll('[data-nav]').forEach((a) => a.classList.remove('active'));
  window.scrollTo(0, 0);

  if (trailMatch) return renderTrail(trailMatch[1]);
  if (hash === '#/submit') return renderSubmit();

  document.title = 'Trailhead — Find your next hike';
  document.querySelector('[data-nav="explore"]').classList.add('active');
  renderExplore();
}

window.addEventListener('hashchange', router);
router();
