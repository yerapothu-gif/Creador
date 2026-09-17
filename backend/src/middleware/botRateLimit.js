// Simple in-memory sliding-window rate limiter, scoped to the bot query
// endpoint only. Keyed by authenticated userId (set by requireAuth), so it
// runs after auth middleware. No new dependency needed for a single-process
// hackathon deployment; each user gets a fresh window once it expires.
const WINDOW_MS = 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 10;

const hits = new Map(); // userId -> array of request timestamps (ms)

function botRateLimit(req, res, next) {
  const userId = req.user?.userId;
  if (!userId) return next();

  const now = Date.now();
  const windowStart = now - WINDOW_MS;

  const timestamps = (hits.get(userId) || []).filter((t) => t > windowStart);

  if (timestamps.length >= MAX_REQUESTS_PER_WINDOW) {
    const retryAfterMs = timestamps[0] + WINDOW_MS - now;
    res.set("Retry-After", Math.ceil(retryAfterMs / 1000).toString());
    return res.status(429).json({
      message: "You're asking questions too quickly. Please wait a moment and try again.",
    });
  }

  timestamps.push(now);
  hits.set(userId, timestamps);
  next();
}

module.exports = { botRateLimit };
