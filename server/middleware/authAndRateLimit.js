import rateLimit from 'express-rate-limit';

/**
 * General rate limiter across all public APIs (150 requests / minute / IP)
 */
export const generalApiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 150,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many requests. Please slow down.' }
});

/**
 * Stricter rate limiter for compute & LLM operations (venue-safe: 60 requests / 15 minutes / IP)
 */
export const computeLlmLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'AI/Compute rate limit reached for this session. Please wait before retrying.' }
});

/**
 * Admin authorization gate for sensitive mutations, monitoring, and dispatch routes
 */
export const requireAdminKey = (req, res, next) => {
  const adminKey = process.env.ADMIN_API_KEY || process.env.ADMIN_SECRET_KEY;
  if (!adminKey) {
    if (process.env.NODE_ENV !== 'production') {
      return next();
    }
    return res.status(500).json({ success: false, error: 'ADMIN_API_KEY is not configured on the server.' });
  }
  const clientKey = req.headers['x-admin-key'] || req.headers['x-api-key'] || req.query.adminKey;
  if (!clientKey || clientKey !== adminKey) {
    return res.status(401).json({ success: false, error: 'Unauthorized: Valid x-admin-key required for administrative operations.' });
  }
  next();
};

/**
 * Bounded sliding window rate limiter for petition endpoints
 */
const petitionRateLimits = new Map();
const MAX_RATE_LIMIT_ENTRIES = 5000;

export function rateLimitPetition(maxReqs = 60, windowMs = 60000) {
  return (req, res, next) => {
    const ip = req.ip || req.headers['x-forwarded-for'] || 'client';
    const now = Date.now();

    // Bounded cleanup to prevent memory exhaustion
    if (petitionRateLimits.size > MAX_RATE_LIMIT_ENTRIES) {
      for (const [k, times] of petitionRateLimits.entries()) {
        const fresh = times.filter(t => now - t < windowMs);
        if (fresh.length === 0) {
          petitionRateLimits.delete(k);
        } else {
          petitionRateLimits.set(k, fresh);
        }
      }
      if (petitionRateLimits.size > MAX_RATE_LIMIT_ENTRIES) {
        petitionRateLimits.clear();
      }
    }

    const records = petitionRateLimits.get(ip) || [];
    const valid = records.filter(t => now - t < windowMs);
    if (valid.length >= maxReqs) {
      return res.status(429).json({
        success: false,
        error: 'Too many requests on petition endpoints. Please slow down.'
      });
    }
    valid.push(now);
    petitionRateLimits.set(ip, valid);
    next();
  };
}
