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

const router = Router();

// ============================================
//  PRODUCT ROUTES WITH ZOD VALIDATION
// ============================================

router.route('/')
  .get(getAllProducts)
  .post(protect, authorize('admin'),validate(createProductSchema), createProduct); 

router.route('/:id')
  .get(getProductById)
  .put(protect, authorize('admin'),validate(updateProductSchema), updateProduct)  
  .delete(protect,authorize('admin'), deleteProduct);

export default router;


