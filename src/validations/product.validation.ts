import { z } from 'zod';

//  Schema for POST /api/products (Create)
export const createProductSchema = z.object({
  body: z.object({
    name: z
      .string({ message: "Name must be a string" })
      .trim()
      .min(1, "Name is required")
      .min(2, "Name must be at least 2 characters long"),

    price: z
      .number({ message: "Price is required and must be a number" })
      .positive("Price must be a positive number"),

    category: z
      .string({ message: "Category must be a string" })
      .trim()
      .min(1, "Category is required")
      .min(2, "Category must be at least 2 characters long"),

    image: z.string().optional(),

    description: z.string().optional()
  })
});

// Schema for PUT /api/products/:id (Update)
export const updateProductSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2, "Name must be at least 2 characters").optional(),
    price: z.number().positive("Price must be a positive number").optional(),
    category: z.string().trim().min(2, "Category must be at least 2 characters").optional(),
    image: z.string().optional(),
    description: z.string().optional()
  })
      // REJECT EMPTY BODY CHECK
    .refine((data) => Object.keys(data).length > 0, {
      message: "Request body cannot be empty. Please provide at least one field to update."
    })
    
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;