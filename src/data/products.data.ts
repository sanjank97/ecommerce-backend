// src/data/products.data.ts
import { Product } from '../types/product.types';

export let products: Product[] = [
  {
    id: 1,
    name: "Wireless Noise Cancelling Headphones",
    price: 2999,
    category: "electronics",
    image: "headphones.jpg",
    description: "Best noise cancelling headphones with 30hr battery"
  },
  {
    id: 2,
    name: "Nike Pro Running Shoes",
    price: 1999,
    category: "fashion",
    image: "shoes.jpg",
    description: "Lightweight and comfortable running shoes"
  },
  {
    id: 3,
    name: "Mechanical Gaming Keyboard RGB",
    price: 4499,
    category: "electronics",
    image: "keyboard.jpg",
    description: "Custom mechanical switches with per-key RGB"
  },
  {
    id: 4,
    name: "Cotton Casual T-Shirt",
    price: 499,
    category: "fashion",
    image: "tshirt.jpg",
    description: "100% pure organic cotton regular fit"
  },
  {
    id: 5,
    name: "Smart Fitness Watch with SpO2",
    price: 3499,
    category: "electronics",
    image: "watch.jpg",
    description: "Tracks heart rate, sleep, steps and oxygen levels"
  },
  {
    id: 6,
    name: "Leather Slim Wallet",
    price: 799,
    category: "accessories",
    image: "wallet.jpg",
    description: "Genuine leather RFID blocking card holder"
  }
];