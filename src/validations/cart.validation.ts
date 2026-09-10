// src/validations/cart.validation.ts

import { z } from 'zod';

// MongoDB ObjectId ka pattern (24 hex characters)
const objectIdRegex = /^[0-9a-fA-F]{24}$/;

// Schema for POST /api/cart (Add item)
export const addToCartSchema = z.object({
  body: z.object({
    productId: z
      .string({ message: "productId is required" })
      .regex(objectIdRegex, "Invalid productId format (must be a 24-character hex ObjectId)"),

    quantity: z.coerce
      .number({ message: "quantity must be a number" })
      .int("quantity must be a whole number")
      .min(1, "Quantity cannot be less than 1")
      .max(999, "Quantity cannot be more than 999")
      .default(1)
  })
});

// Schema for DELETE /api/cart/:productId (Remove single item)
export const removeFromCartSchema = z.object({
  params: z.object({
    productId: z
      .string({ message: "productId is required" })
      .regex(objectIdRegex, "Invalid productId format (must be a 24-character hex ObjectId)")
  })
});

export type AddToCartInput = z.infer<typeof addToCartSchema>;
export type RemoveFromCartInput = z.infer<typeof removeFromCartSchema>;
