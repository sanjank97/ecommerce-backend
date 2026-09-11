import { z } from 'zod';

//  Schema for POST /api/products (Create)
// NOTE: Ye route ab multipart/form-data bhi accept karta hai (image upload).
// Form-data me saare values STRING me aate hain — isliye price pe
// z.coerce.number() lagaya hai (string "2999" → number 2999).
// JSON request me normal number bhi sahi chalta hai. ✅
export const createProductSchema = z.object({
  body: z.object({
    name: z
      .string({ message: "Name must be a string" })
      .trim()
      .min(1, "Name is required")
      .min(2, "Name must be at least 2 characters long"),

    price: z.coerce
      .number({ message: "Price is required and must be a number" })
      .positive("Price must be a positive number"),

    category: z
      .string({ message: "Category must be a string" })
      .trim()
      .min(1, "Category is required")
      .min(2, "Category must be at least 2 characters long"),

    // Image ab 2 tarike se aa sakti hai:
    //   1. JSON body me direct URL string (ya toh Cloudinary URL ya koi aur)
    //   2. multipart/form-data me "images" files (middleware/controller handle karta hai)
    image: z.string().optional(),

    // Gallery + publicId (Cloudinary se aate hain — optional passthrough)
    imagePublicId: z.string().optional(),
    images: z
      .array(
        z.object({
          url: z.string(),
          publicId: z.string()
        })
      )
      .optional(),

    description: z.string().optional()
  })
});

// Schema for PUT /api/products/:id (Update)
// (Empty body allowed NAHI hai — lekin agar sirf images upload hui hain
//  toh middleware req.body.image = "" set kar deta hai, isliye body
//  "empty" nahi rehti aur image-only update bhi kaam karta hai)
export const updateProductSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2, "Name must be at least 2 characters").optional(),
    price: z.coerce.number().positive("Price must be a positive number").optional(),
    category: z.string().trim().min(2, "Category must be at least 2 characters").optional(),
    image: z.string().optional(),
    imagePublicId: z.string().optional(),
    images: z
      .array(
        z.object({
          url: z.string(),
          publicId: z.string()
        })
      )
      .optional(),
    description: z.string().optional()
  })
      // REJECT EMPTY BODY CHECK
    .refine((data) => Object.keys(data).length > 0, {
      message: "Request body cannot be empty. Please provide at least one field to update."
    })
    
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;