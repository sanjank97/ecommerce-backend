// src/validations/product.validation.ts
import { z } from 'zod';

// 1️⃣ Schema for POST /api/products (Create)
export const createProductSchema = z.object({
  body: z.object({
    name: z
      .string({ required_error: "Name is required" })
      .trim()
      .min(2, "Name must be at least 2 characters long"),

    price: z
      .number({ required_error: "Price is required" })
      .positive("Price must be a positive number"),

    category: z
      .string({ required_error: "Category is required" })
      .trim()
      .min(2, "Category must be at least 2 characters long"),

    image: z.string().optional(),

    description: z.string().optional()
  })
});

// 2️⃣ Schema for PUT /api/products/:id (Update - Saari fields optional!)
export const updateProductSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2, "Name must be at least 2 characters").optional(),
    price: z.number().positive("Price must be a positive number").optional(),
    category: z.string().trim().min(2, "Category must be at least 2 characters").optional(),
    image: z.string().optional(),
    description: z.string().optional()
  })
});

// TypeScript type inference (Extra superpower of Zod!)
export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;