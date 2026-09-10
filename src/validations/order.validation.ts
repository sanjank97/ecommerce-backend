// src/validations/order.validation.ts

import { z } from 'zod';

// MongoDB ObjectId ka pattern (24 hex characters)
const objectIdRegex = /^[0-9a-fA-F]{24}$/;

// ============================================
// Schema for POST /api/orders (Checkout)
// ============================================
export const createOrderSchema = z.object({
  body: z.object({
    shippingAddress: z.object({
      fullName: z
        .string({ message: 'fullName is required' })
        .trim()
        .min(2, 'Full name must be at least 2 characters'),

      phone: z
        .string({ message: 'phone is required' })
        .trim()
        .regex(/^[0-9+\-\s]{10,15}$/, 'Phone must be 10-15 digits (spaces/-/+ allowed)'),

      street: z
        .string({ message: 'street is required' })
        .trim()
        .min(5, 'Street address must be at least 5 characters'),

      city: z
        .string({ message: 'city is required' })
        .trim()
        .min(2, 'City must be at least 2 characters'),

      state: z
        .string({ message: 'state is required' })
        .trim()
        .min(2, 'State must be at least 2 characters'),

      zipCode: z
        .string({ message: 'zipCode is required' })
        .trim()
        .regex(/^[0-9]{5,6}$/, 'Zip code must be 5-6 digits'),

      country: z
        .string()
        .trim()
        .min(2, 'Country must be at least 2 characters')
        .default('India')
    }),

    paymentMethod: z.enum(['COD', 'card', 'upi']).default('COD')
  })
});

// ============================================
// Schema for GET/PUT /api/orders/:id
// ============================================
export const orderIdParamSchema = z.object({
  params: z.object({
    id: z
      .string({ message: 'Order id is required' })
      .regex(objectIdRegex, 'Invalid order id format (must be a 24-character hex ObjectId)')
  })
});

// ============================================
// Schema for PUT /api/orders/:id/status (Admin)
// ============================================
export const updateOrderStatusSchema = z.object({
  params: z.object({
    id: z
      .string({ message: 'Order id is required' })
      .regex(objectIdRegex, 'Invalid order id format (must be a 24-character hex ObjectId)')
  }),
  body: z.object({
    orderStatus: z.enum(['confirmed', 'shipped', 'delivered', 'cancelled'])
  })
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;
