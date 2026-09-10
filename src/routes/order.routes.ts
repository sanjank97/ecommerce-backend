// src/routes/order.routes.ts

import { Router } from 'express';
import {
  createOrder,
  getMyOrders,
  getOrderById,
  cancelOrder,
  getAllOrders,
  updateOrderStatus
} from '../controllers/order.controller';
import { protect, authorize } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import {
  createOrderSchema,
  orderIdParamSchema,
  updateOrderStatusSchema
} from '../validations/order.validation';

const router = Router();

// Saare Order Routes Logged-In Users Only
router.use(protect);

// Checkout — cart se order banao
// Admin — saare orders dekho (GET /api/orders?status=pending&limit=20)
router.route('/')
  .post(validate(createOrderSchema), createOrder)
  .get(authorize('admin'), getAllOrders);

// ⚠️ '/my-orders' ko '/:id' se PEHLE declare karo
// (warna Express 'my-orders' ko :id samajh ke validate fail kar dega)
router.get('/my-orders', getMyOrders);

// Single order — owner ya admin
router.route('/:id')
  .get(validate(orderIdParamSchema), getOrderById);

// User apna order cancel kar sakta hai (sirf pending/confirmed state me)
router.route('/:id/cancel')
  .put(validate(orderIdParamSchema), cancelOrder);

// Admin order lifecycle: pending → confirmed → shipped → delivered
router.route('/:id/status')
  .put(authorize('admin'), validate(updateOrderStatusSchema), updateOrderStatus);

export default router;
