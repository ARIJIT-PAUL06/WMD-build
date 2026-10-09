import crypto from 'crypto';
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
 * Admin authorization gate for sensitive mutations, monitoring, and dispatch routes.
 * Enforces fail-closed semantics, header-only transmission, and SHA-256 timing-safe comparison.
 */
export const requireAdminKey = (req, res, next) => {
  const adminKey = process.env.ADMIN_API_KEY || process.env.ADMIN_SECRET_KEY;
  if (!adminKey) {
    return res.status(503).json({
      success: false,
      error: 'ADMIN_API_KEY is not configured on server. Administrative mutations are disabled.'
    });
  }

  // Header-only transmission prevents credential leakage in CloudWatch/access logs
  const clientKey = req.headers['x-admin-key'] || req.headers['x-api-key'];
  if (!clientKey || typeof clientKey !== 'string') {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized: Valid x-admin-key header required for administrative operations.'
    });
  }

  // Pre-hash to 256 bits so buffers always match length, defeating length-oracle timing leaks
  const adminHash = crypto.createHash('sha256').update(adminKey).digest();
  const clientHash = crypto.createHash('sha256').update(clientKey).digest();

  if (!crypto.timingSafeEqual(adminHash, clientHash)) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized: Invalid administrative credentials.'
    });
  }

  next();
};

/**
 * Gate to prevent autonomous monitoring cycle and emergency dispatch over HTTP in production.
 * Scheduled cycles execute via AWS EventBridge or authorized CLI.
 */
export const disallowHttpDispatchInProd = (req, res, next) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({
      success: false,
      error: 'http_dispatch_disabled',
      message: 'Autonomous monitoring cycle and emergency dispatch over HTTP are disabled in production. Scheduled cycles execute via AWS EventBridge or authorized CLI.'
    });
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

/**
 * User-keyed sliding window rate limiter for authenticated endpoints (keyed on req.user.sub)
 */
const userRateLimits = new Map();
const MAX_USER_RATE_LIMIT_ENTRIES = 5000;

export function rateLimitPerUser(maxReqs = 30, windowMs = 60000) {
  return (req, res, next) => {
    const key = req.user?.sub ? `usr:${req.user.sub}` : `ip:${req.ip || req.headers['x-forwarded-for'] || 'client'}`;
    const now = Date.now();

    if (userRateLimits.size > MAX_USER_RATE_LIMIT_ENTRIES) {
      for (const [k, times] of userRateLimits.entries()) {
        const fresh = times.filter(t => now - t < windowMs);
        if (fresh.length === 0) {
          userRateLimits.delete(k);
        } else {
          userRateLimits.set(k, fresh);
        }
      }
      if (userRateLimits.size > MAX_USER_RATE_LIMIT_ENTRIES) {
        userRateLimits.clear();
      }
    }

    const records = userRateLimits.get(key) || [];
    const valid = records.filter(t => now - t < windowMs);
    if (valid.length >= maxReqs) {
      return res.status(429).json({
        success: false,
        error: 'Too many requests for this account. Please slow down.'
      });
    }
    valid.push(now);
    userRateLimits.set(key, valid);
    next();
  };
}
