import helmet from "helmet";
import rateLimit from "express-rate-limit";

export const securityHeaders = helmet({
  contentSecurityPolicy: false
});

export const globalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: "draft-8",
  legacyHeaders: false
});

export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    success: false,
    error: "Too many authentication attempts. Please try again later."
  }
});
