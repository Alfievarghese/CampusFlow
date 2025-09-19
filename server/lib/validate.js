/** Lightweight validation helpers for CampusFlow API routes. */

function requireFields(body, fields) {
  const missing = fields.filter(f => !body[f] || String(body[f]).trim() === '');
  return missing.length === 0 ? null : 'Missing required fields: ' + missing.join(', ');
}

function validateTimeRange(start, end) {
  const s = new Date(start), e = new Date(end);
  if (isNaN(s.getTime()) || isNaN(e.getTime())) return 'Invalid datetime format.';
  if (s >= e) return 'Start time must be before end time.';
  return null;
}

function validateNotPast(start) {
  return new Date(start) < new Date() ? 'Event start time cannot be in the past.' : null;
}

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? null : 'Invalid email address.';
}

module.exports = { requireFields, validateTimeRange, validateNotPast, validateEmail };


// Usage: const err = requireFields(req.body, ["title","startTime"]); if (err) return res.status(400).json({ error: err });
