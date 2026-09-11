// src/routes/upload.routes.ts

/**
 * UPLOAD ROUTES — /api/uploads
 * ============================
 * File/Image upload endpoints (Multer + Cloudinary).
 *
 * Sab routes protected + admin-only hain (sirf admin hi products/files
 * upload karta hai is app me). Agar future me user avatars add karna ho,
 * toh /image route se `authorize('admin')` hata dena.
 */

import { Router } from 'express';
import {
  uploadSingleImage,
  uploadSingleFile,
  uploadProductImages as uploadProductImagesMulter
} from '../middleware/upload.middleware';
import {
  uploadImage,
  uploadProductImages,
  uploadFile,
  deleteUpload
} from '../controllers/upload.controller';
import { protect, authorize } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { destroyUploadSchema } from '../validations/upload.validation';

const router = Router();

// 1. Single image upload — form-data field: "image"
router.post('/image', protect, authorize('admin'), uploadSingleImage, uploadImage);

// 2. Product images (batch, max 5) — form-data field: "images"
router.post('/product-images', protect, authorize('admin'), uploadProductImagesMulter, uploadProductImages);

// 3. Generic file upload (pdf/doc/zip...) — form-data field: "file"
router.post('/file', protect, authorize('admin'), uploadSingleFile, uploadFile);

// 4. Cloudinary asset delete — JSON body: { publicId, resourceType? }
router.post('/destroy', protect, authorize('admin'), validate(destroyUploadSchema), deleteUpload);

export default router;
