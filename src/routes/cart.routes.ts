// src/routes/cart.routes.ts

import { Router } from 'express';
import {
  getCart,
  addToCart,
  removeFromCart,
  clearCart
} from '../controllers/cart.controller';
import { protect } from '../middleware/auth.middleware';

const router = Router();

// Saare Cart Routes Logged-In Users Only (Protect Middleware applied globally to router)
router.use(protect);

router.route('/')
  .get(getCart)
  .post(addToCart)
  .delete(clearCart);

router.route('/:productId')
  .delete(removeFromCart);

export default router;