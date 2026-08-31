import { Router } from 'express';
import {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct
} from '../controllers/product.controller';

const router = Router();

// ============================================
//  PRODUCT ROUTES
// ============================================

// Tarika 1: Chained Route (Clean & Industry Standard )
router.route('/')
  .get(getAllProducts)      // GET /api/products
  .post(createProduct);     // POST /api/products

router.route('/:id')
  .get(getProductById)      // GET /api/products/:id
  .put(updateProduct)       // PUT /api/products/:id
  .delete(deleteProduct);   // DELETE /api/products/:id

export default router;