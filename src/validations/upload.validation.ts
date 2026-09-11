// src/validations/upload.validation.ts

import { z } from 'zod';

/**
 * Schema for POST /api/uploads/destroy
 * Cloudinary se koi asset delete karne ke liye (public_id chahiye hoti hai).
 */
export const destroyUploadSchema = z.object({
  body: z.object({
    // public_id me slashes hoti hain: "ecommerce/products/abc123"
    publicId: z
      .string({ message: 'publicId is required (Cloudinary public_id)' })
      .trim()
      .min(1, 'publicId cannot be empty'),

    // Cloudinary ko resource type batana padta hai delete ke waqt
    resourceType: z
      .enum(['image', 'raw', 'video'], { message: 'resourceType must be one of: image, raw, video' })
      .optional()
      .default('image')
  })
});

export type DestroyUploadInput = z.infer<typeof destroyUploadSchema>;
