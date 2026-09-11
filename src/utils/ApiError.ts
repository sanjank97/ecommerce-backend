// src/utils/ApiError.ts

/**
 * Custom Error class with HTTP status code.
 *
 * Global error handler (error.middleware.ts) isko pehchanta hai:
 *   const statusCode = err.statusCode || err.status || 500
 *
 * Isliye jahan bhi controlled error bhejni ho (jaise Multer file filter,
 * Cloudinary config missing, etc.) — `throw new ApiError(400, "...")`
 * ya `next(new ApiError(400, "..."))` use karo. Response automatically
 * sahi status code ke sath jayegi.
 */
export class ApiError extends Error {
  statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
  }
}
