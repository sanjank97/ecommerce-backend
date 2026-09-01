// src/models/product.model.ts
import { Schema, model, Document } from 'mongoose';

// TypeScript Interface (Data Type definition)
export interface IProduct extends Document {
  name: string;
  price: number;
  category: string;
  image: string;
  description: string;
  createdAt: Date;
  updatedAt: Date;
}

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