import rateLimit from 'express-rate-limit';

// 1. General API Rate Limiter (For all routes)
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes window
  max: 100, // Limit each IP to 100 requests per 15 mins
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: "Too many requests from this IP. Please try again after 15 minutes."
  }
});

// 2. Strict Auth Rate Limiter (Brute-force protection for Login & Register)
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Max 10 attempts per 15 minutes per IP
  message: {
    success: false,
    error: "Too many login/register attempts. Account temporarily locked for 15 minutes."
  }
});