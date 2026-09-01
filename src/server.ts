// src/server.ts

/***
 * Mongo DB
 * username : sanjangigsoft_db_user
 * password : RO6gsS97fTIPJ0fy
 * mongodb+srv://<db_username>:RO6gsS97fTIPJ0fy@cluster0.0telrwn.mongodb.net/?appName=Cluster0
 * 
 */



import express, { Application, Request, Response } from 'express';
import dotenv from 'dotenv';
import cors from 'cors';

import { connectDB } from './config/db';
// Import Routes & Middlewares
import productRoutes from './routes/product.routes';
import { notFoundHandler, errorHandler } from './middleware/error.middleware';

dotenv.config();

connectDB();

const app: Application = express();
const PORT = process.env.PORT || 5000;

// ============================================
// 1. GLOBAL MIDDLEWARES
// ============================================
app.use(cors());
app.use(express.json());

// ============================================
// 2. HEALTH CHECK ROUTE
// ============================================
app.get('/', (req: Request, res: Response) => {
  res.json({ message: "API is running smoothly! 🚀" });
});

// ============================================
// 3. API ROUTES
// ============================================
// Saare product routes ko '/api/products' prefix ke sath mount kar diya
app.use('/api/products', productRoutes);

// ============================================
// 4. ERROR MIDDLEWARES (Always at the end)
// ============================================
app.use(notFoundHandler);
app.use(errorHandler);

// ============================================
// 5. SERVER START
// ============================================
app.listen(PORT, () => {
  console.log(`🚀 Server running in ${process.env.NODE_ENV || 'development'} mode on http://localhost:${PORT}`);
});