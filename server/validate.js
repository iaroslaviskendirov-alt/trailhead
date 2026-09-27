const DIFFICULTIES = ['easy', 'moderate', 'hard'];

class ValidationError extends Error {
  constructor(errors) {
    super('Validation failed');
    this.status = 400;
    this.errors = errors;
  }
}

function str(value, field, { min = 1, max }, errors) {
  if (typeof value !== 'string' || value.trim().length < min) {
    errors[field] = `${field} is required${min > 1 ? ` (at least ${min} characters)` : ''}`;
    return undefined;
  }
  const v = value.trim();
  if (v.length > max) errors[field] = `${field} must be at most ${max} characters`;
  return v;
}

function num(value, field, { min, max, integer = false }, errors) {
  if (value === undefined || value === null || value === '') {
    errors[field] = `${field} is required`;
    return undefined;
  }
  const n = typeof value === 'string' && value.trim() !== '' ? Number(value) : value;
  if (typeof n !== 'number' || !Number.isFinite(n)) {
    errors[field] = `${field} must be a number`;
    return undefined;
  }
  if (integer && !Number.isInteger(n)) errors[field] = `${field} must be a whole number`;
  else if (n < min || n > max) errors[field] = `${field} must be between ${min} and ${max}`;
  return n;
}

function validateReview(body = {}) {
  const errors = {};
  const review = {
    author: str(body.author, 'author', { min: 2, max: 40 }, errors),
    rating: num(body.rating, 'rating', { min: 1, max: 5, integer: true }, errors),
    comment: str(body.comment, 'comment', { min: 5, max: 600 }, errors),
  };
  if (Object.keys(errors).length) throw new ValidationError(errors);
  return review;
}

function validateTrail(body = {}) {
  const errors = {};
  const trail = {
    name: str(body.name, 'name', { min: 3, max: 80 }, errors),
    region: str(body.region, 'region', { min: 2, max: 60 }, errors),
    difficulty: body.difficulty,
    length_km: num(body.length_km, 'length_km', { min: 0.1, max: 200 }, errors),
    elevation_m: num(body.elevation_m, 'elevation_m', { min: 0, max: 9000, integer: true }, errors),
    duration_h: num(body.duration_h, 'duration_h', { min: 0.1, max: 72 }, errors),
    description: str(body.description, 'description', { min: 20, max: 1000 }, errors),
    tags: [],
  };

  if (!DIFFICULTIES.includes(body.difficulty)) {
    errors.difficulty = `difficulty must be one of: ${DIFFICULTIES.join(', ')}`;
  }

  if (body.tags !== undefined) {
    const raw = Array.isArray(body.tags) ? body.tags : String(body.tags).split(',');
    trail.tags = [...new Set(
      raw.map((t) => String(t).trim().toLowerCase().replace(/\s+/g, '-')).filter(Boolean)
    )];
    if (trail.tags.length > 6) errors.tags = 'at most 6 tags';
    else if (trail.tags.some((t) => t.length > 24)) errors.tags = 'each tag must be at most 24 characters';
  }

  if (Object.keys(errors).length) throw new ValidationError(errors);
  return trail;
}

module.exports = { validateReview, validateTrail, ValidationError, DIFFICULTIES };
