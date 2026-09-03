// src/middleware/sanitize.middleware.ts

import { Request, Response, NextFunction } from 'express';

/**
 * Recursively remove MongoDB operators ($gt, $ne, etc.) and dangerous keys
 * from objects / arrays to prevent NoSQL injection.
 */
const clean = (value: unknown): unknown => {
  if (value === null || value === undefined) return value;

  // Arrays
  if (Array.isArray(value)) {
    return value.map((item) => clean(item));
  }

  // Objects
  if (typeof value === 'object') {
    const result: Record<string, unknown> = {};

    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      // ❌ Block keys starting with $ or containing .
      // e.g. "$gt", "$ne", "user.email" style injection keys
      if (key.startsWith('$') || key.includes('.')) {
        continue; // skip dangerous key
      }
      result[key] = clean(val);
    }

    return result;
  }

  // strings, numbers, booleans — as-is
  return value;
};

/**
 * NoSQL Injection Sanitizer (Express 5 safe)
 * - Cleans req.body (writable) ✅
 * - Cleans req.params (usually writable) ✅
 * - Cleans req.query WITHOUT reassigning req.query (read-only in Express 5) ✅
 */
export const sanitizeData = (req: Request, res: Response, next: NextFunction): void => {

     console.log('BEFORE sanitize body:', JSON.stringify(req.body));
  if (req.body && typeof req.body === 'object') {
    req.body = clean(req.body) as Request['body'];
  }

  if (req.params && typeof req.params === 'object') {
    const cleanedParams = clean(req.params) as Record<string, string>;
    // mutate keys in-place instead of full replace when possible
    Object.keys(req.params).forEach((key) => {
      delete (req.params as any)[key];
    });
    Object.assign(req.params, cleanedParams);
  }

  if (req.query && typeof req.query === 'object') {
    const cleanedQuery = clean(req.query) as Record<string, unknown>;

    // Express 5: req.query is getter-only — reassign mat karo
    // In-place clean: dangerous keys hatao
    Object.keys(req.query).forEach((key) => {
      if (key.startsWith('$') || key.includes('.')) {
        delete (req.query as any)[key];
      } else {
        (req.query as any)[key] = cleanedQuery[key];
      }
    });
  }
  console.log('AFTER sanitize body:', JSON.stringify(req.body));
  next();
};