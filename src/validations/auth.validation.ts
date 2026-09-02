// src/validations/auth.validation.ts

import { z } from 'zod';

// Register Validation Schema
export const registerSchema = z.object({
  body: z.object({
    name: z
      .string({ message: "Name is required" })
      .trim()
      .min(2, "Name must be at least 2 characters"),

    email: z
      .string({ message: "Email is required" })
      .trim()
      .email("Please enter a valid email address"),

    password: z
      .string({ message: "Password is required" })
      .min(6, "Password must be at least 6 characters long"),

    role: z.enum(['customer', 'admin']).optional()
  })
});

// Login Validation Schema
export const loginSchema = z.object({
  body: z.object({
    email: z
      .string({ message: "Email is required" })
      .trim()
      .email("Please enter a valid email address"),

    password: z
      .string({ message: "Password is required" })
      .min(1, "Password cannot be empty")
  })
});