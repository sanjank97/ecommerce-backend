// src/middleware/upload.middleware.ts

/**
 * MULTER UPLOAD MIDDLEWARE
 * ========================
 * Multer — multipart/form-data requests ko parse karta hai
 * (files ko RAM me buffer banata hai, phir hum use Cloudinary pe bhejte hain).
 *
 * Security layers:
 *   1. Memory storage   → disk pe kuch nahi likha jaata (serverless friendly)
 *   2. MIME whitelist   → sirf allowed file types (svg/exe blocked!)
 *   3. Size limits      → image: 5MB, generic file: 10MB
 *   4. File count limit → product images max 5 per request
 *   5. Random filename  → Cloudinary unique_filename (path traversal safe)
 */

import multer, { MulterError } from 'multer';
import { Request, Response, NextFunction, RequestHandler } from 'express';
import { ApiError } from '../utils/ApiError';

// ============================================
// 1. STORAGE — Memory (RAM) me buffer
//    (Cloudinary pe stream karne ke liye best practice)
// ============================================
const storage = multer.memoryStorage();

// ============================================
// 2. FILE FILTERS — MIME type whitelist
// ============================================

// Sirf ye image types allow hain (svg intentionally blocked — XSS/scripts risk)
const ALLOWED_IMAGE_MIMES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif'
]);

// Generic files: images + documents (pdf/doc/docx/xls/xlsx/ppt/pptx) + zip + text/csv/json
const ALLOWED_FILE_MIMES = new Set([
  ...ALLOWED_IMAGE_MIMES,
  'application/pdf',
  'application/msword',                                                                    // .doc
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',               // .docx
  'application/vnd.ms-excel',                                                              // .xls
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',                     // .xlsx
  'application/vnd.ms-powerpoint',                                                         // .ppt
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',            // .pptx
  'application/zip',
  'text/plain',
  'text/csv',
  'application/json'
]);

const imageFileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (ALLOWED_IMAGE_MIMES.has(file.mimetype)) {
    cb(null, true); // ✅ allowed
  } else {
    // ❌ Reject — yeh error seedha global error handler tak jaayegi (400)
    cb(new ApiError(400, `File type "${file.mimetype}" is not allowed. Only image files are allowed (jpeg, jpg, png, webp, gif, avif).`));
  }
};

const anyFileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (ALLOWED_FILE_MIMES.has(file.mimetype)) {
    cb(null, true); // ✅ allowed
  } else {
    cb(new ApiError(400, `File type "${file.mimetype}" is not allowed. Allowed: images, pdf, doc(x), xls(x), ppt(x), zip, txt, csv, json.`));
  }
};

// ============================================
// 3. MULTER INSTANCES (limits ke sath)
// ============================================

// Product images — multiple allowed (max 5), 5MB each
const productImagesMulter = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB per file
    files: 5                   // max 5 files per request
  },
  fileFilter: imageFileFilter
});

// Single image (avatar, thumbnails etc.) — 5MB
const singleImageMulter = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB
    files: 1
  },
  fileFilter: imageFileFilter
});

// Single generic file (pdf/doc/zip...) — 10MB
const singleFileMulter = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB
    files: 1
  },
  fileFilter: anyFileFilter
});

// ============================================
// 4. ERROR TRANSLATOR
//    MulterError ko user-friendly 400 errors me convert karta hai,
//    warna global error handler unhe 500 samajh leta.
// ============================================
const MESSAGES: Record<string, string> = {
  LIMIT_FILE_SIZE: 'File too large! Max allowed size is 5MB for images and 10MB for other files.',
  LIMIT_FILE_COUNT: 'Too many files! Maximum 5 product images per request.',
  LIMIT_UNEXPECTED_FILE: 'Unexpected form field. Use field name "images" for product images, "image" for single image, or "file" for documents.',
  LIMIT_FIELD_KEY: 'Form field name is too long.',
  LIMIT_FIELD_VALUE: 'Form field value is too long.',
  LIMIT_FIELD_COUNT: 'Too many form fields.',
  LIMIT_FIELD_PARTS: 'Too many parts in the multipart form.'
};

const wrapMulter = (multerMiddleware: RequestHandler): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction): void => {
    multerMiddleware(req, res, (err: any) => {
      if (!err) return next(); // ✅ sab sahi — aage badho

      // Multer ke apne errors (size/count/field) → clean 400 message
      if (err instanceof MulterError) {
        return next(new ApiError(400, MESSAGES[err.code] || `Upload error: ${err.message}`));
      }

      // fileFilter ka ApiError ya koi aur error → as-is pass
      return next(err);
    });
  };
};

// ============================================
// 5. EXPORTED MIDDLEWARES
// ============================================

/**
 * Product routes ke liye — form field name: "images" (max 5 files).
 * POST/PUT /api/products pe lagta hai (JSON requests pe no-op hai).
 *
 * Extra: Agar files aayi hain lekin text fields nahi (sirf image update),
 * toh req.body.image = "" set karte hain — warna "empty body" validation
 * update request ko reject kar deti hai. Controller isko Cloudinary URL
 * se replace kar deta hai.
 */
export const uploadProductImages = wrapMulter((req, res, next) => {
  productImagesMulter.fields([{ name: 'images', maxCount: 5 }])(req, res, (err: any) => {
    if (err) return next(err);

    // Files parsed successfully — ab sentinel check
    const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
    if (files?.images?.length && Object.keys(req.body).length === 0) {
      (req.body as Record<string, unknown>).image = ''; // controller isko overwrite karega
    }

    next();
  });
});

/** Single image upload — form field name: "image" */
export const uploadSingleImage = wrapMulter(singleImageMulter.single('image'));

/** Single generic file (pdf/doc/zip) — form field name: "file" */
export const uploadSingleFile = wrapMulter(singleFileMulter.single('file'));
