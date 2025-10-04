import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';

// Extend Request interface to include rateLimit property
declare global {
  namespace Express {
    interface Request {
      rateLimit?: {
        limit: number;
        used: number;
        remaining: number;
        resetTime: Date;
      };
    }
  }
}

// Custom error message handler
const createErrorMessage = (retryAfter: number) => ({
  error: 'Too many requests',
  message: 'Rate limit exceeded. Please try again later.',
  retryAfter: retryAfter,
  type: 'RATE_LIMIT_EXCEEDED'
});

// Custom rate limit handler
const rateLimitHandler = (req: Request, res: Response): void => {
  const retryAfter = Math.round(req.rateLimit?.resetTime ? (req.rateLimit.resetTime.getTime() - Date.now()) / 1000 : 60);

  console.log(`🚫 Rate limit exceeded for IP ${req.ip} on ${req.path}`);

  res.status(429).json(createErrorMessage(retryAfter));
};

// Skip successful requests for auth endpoints (only count failed attempts)
const skipSuccessfulAuth = (req: Request, res: Response): boolean => {
  return res.statusCode < 400;
};

// General API rate limiter - applies to all API routes
export const generalApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: createErrorMessage(15 * 60), // 15 minutes in seconds
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: rateLimitHandler,
  validate: {
    xForwardedForHeader: false, // Don't trust X-Forwarded-For header by default
  },
});

// Authentication rate limiter - stricter limits for auth endpoints
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 auth attempts per windowMs
  message: createErrorMessage(15 * 60),
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
  skipSuccessfulRequests: true, // Only count failed auth attempts
  skip: skipSuccessfulAuth,
});

// OAuth callback limiter - prevent OAuth abuse
export const oauthLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10, // limit each IP to 10 OAuth attempts per 5 minutes
  message: createErrorMessage(5 * 60),
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
});

// Repository scanning limiter - expensive operations
export const scanLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 3, // limit each IP to 3 scan operations per 10 minutes
  message: createErrorMessage(10 * 60),
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
});

// Translation requests limiter - AI API calls are expensive
export const translationLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 10, // limit each IP to 10 translation requests per minute
  message: createErrorMessage(60),
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
});

// Repository list limiter - less strict for data retrieval
export const dataRetrievalLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // limit each IP to 30 requests per minute
  message: createErrorMessage(60),
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
});

// Health check limiter - very permissive for monitoring
export const healthCheckLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 60, // limit each IP to 60 health checks per minute
  message: createErrorMessage(60),
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
});

// Middleware to log rate limit information
export const rateLimitLogger = (req: Request, res: Response, next: Function): void => {
  const originalSend = res.send;

  res.send = function(data: any) {
    // Log rate limit headers for monitoring
    if (req.rateLimit) {
      console.log(`📊 Rate limit info for ${req.ip} on ${req.path}:`, {
        limit: req.rateLimit.limit,
        used: req.rateLimit.used,
        remaining: req.rateLimit.remaining,
        resetTime: req.rateLimit.resetTime
      });
    }

    return originalSend.call(this, data);
  };

  next();
};

// Environment-based rate limiting (stricter in production)
export const getEnvironmentLimiter = () => {
  const isProduction = process.env.NODE_ENV === 'production';

  return rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: isProduction ? 50 : 200, // Stricter limits in production
    message: createErrorMessage(15 * 60),
    standardHeaders: true,
    legacyHeaders: false,
    handler: rateLimitHandler,
  });
};

export default {
  generalApiLimiter,
  authLimiter,
  oauthLimiter,
  scanLimiter,
  translationLimiter,
  dataRetrievalLimiter,
  healthCheckLimiter,
  rateLimitLogger,
  getEnvironmentLimiter
};