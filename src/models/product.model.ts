// src/models/product.model.ts
import { Schema, model, Document } from 'mongoose';

// Gallery image ki structure (Cloudinary se aati hai)
export interface IProductImage {
  url: string;      // Cloudinary secure_url — frontend isse image dikhata hai
  publicId: string; // Cloudinary public_id — delete/replace karne ke liye
}

// TypeScript Interface (Data Type definition)
export interface IProduct extends Document {
  name: string;
  price: number;
  category: string;
  image: string;          // Main image (Cloudinary URL ya koi bhi URL)
  imagePublicId?: string; // Main image ka Cloudinary public_id (cleanup ke liye)
  images?: IProductImage[]; // Image gallery (multiple views of product)
  description: string;
  createdAt: Date;
  updatedAt: Date;
}

// Gallery sub-schema (_id nahi chahiye har image pe)
const productImageSchema = new Schema<IProductImage>(
  {
    url: { type: String, required: true, trim: true },
    publicId: { type: String, required: true, trim: true }
  },
  { _id: false }
);

// 2. Mongoose Schema (Database Rules & Validations)
const productSchema = new Schema<IProduct>(
  {
    name: {
      type: String,
      required: [true, "Product name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters"]
    },
    price: {
      type: Number,
      required: [true, "Product price is required"],
      min: [0, "Price cannot be negative"]
    },
    category: {
      type: String,
      required: [true, "Product category is required"],
      lowercase: true,
      trim: true
    },
    image: {
      type: String,
      default: "default.jpg"
    },
    // Cloudinary public_id — jab image replace/delete ho toh purani file
    // cloud se bhi delete ho sake (warna orphan files jama hoti rehti hain)
    imagePublicId: {
      type: String,
      default: ""
    },
    // Image gallery — [{ url, publicId }]
    images: {
      type: [productImageSchema],
      default: []
    },
    description: {
      type: String,
      default: ""
    }
  },
  {
    timestamps: true //  Automatically adds 'createdAt' and 'updatedAt' fields!
  }
);

// 3. Export Mongoose Model
export const ProductModel = model<IProduct>('Product', productSchema);