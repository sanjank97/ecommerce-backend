// src/routes/cart.routes.ts

import { Router } from 'express';
import {
  getCart,
  addToCart,
  removeFromCart,
  clearCart
} from '../controllers/cart.controller';
import { protect } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { addToCartSchema, removeFromCartSchema } from '../validations/cart.validation';

const router = Router();

// Saare Cart Routes Logged-In Users Only (Protect Middleware applied globally to router)
router.use(protect);

router.route('/')
  .get(getCart)
  .post(validate(addToCartSchema), addToCart)
  .delete(clearCart);

router.route('/:productId')
  .delete(validate(removeFromCartSchema), removeFromCart);

export default router;