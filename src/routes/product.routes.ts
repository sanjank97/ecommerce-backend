// src/routes/product.routes.ts

import { Router } from 'express';
import {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct
} from '../controllers/product.controller';

// 1. Import Validate Middleware & Schemas
import { validate } from '../middleware/validate.middleware';
import { createProductSchema, updateProductSchema } from '../validations/product.validation';
import { protect, authorize } from '../middleware/auth.middleware';
// 2. Upload Middleware (Multer) + Sanitize (multipart text fields ke liye)
import { uploadProductImages } from '../middleware/upload.middleware';
import { sanitizeData } from '../middleware/sanitize.middleware';

const router = Router();

// ============================================
//  PRODUCT ROUTES WITH ZOD VALIDATION
// ============================================
// POST/PUT ab DO formats support karte hain:
//   1. JSON body (image as URL string) — pehle jaisa
//   2. multipart/form-data — "images" field me files (max 5, 5MB each)
//      → Controller unhe Cloudinary pe upload karke URL save karta hai
//
// Middleware order IMPORTANT hai:
//   multer (files+fields parse) → sanitize (form fields clean) → zod validate
// (JSON request pe multer no-op hai — purana flow bilkul same chalta rahega)

router.route('/')
  .get(getAllProducts)
  .post(
    protect,
    authorize('admin'),
    uploadProductImages,
    sanitizeData,
    validate(createProductSchema),
    createProduct
  ); 

router.route('/:id')
  .get(getProductById)
  .put(
    protect,
    authorize('admin'),
    uploadProductImages,
    sanitizeData,
    validate(updateProductSchema),
    updateProduct
  )  
  .delete(protect,authorize('admin'), deleteProduct);

export default router;


