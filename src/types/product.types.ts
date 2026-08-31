// src/types/product.types.ts

export interface Product {
  id: number;
  name: string;
  price: number;
  category: string;
  image: string;
  description: string;
}

// Request body type for Create/Update
export interface ProductInput {
  name: string;
  price: number;
  category: string;
  image?: string;
  description?: string;
}