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
import helmet from 'helmet';

import { connectDB } from './config/db';
// Import Routes & Middlewares
import productRoutes from './routes/product.routes';
import authRoutes from './routes/auth.routes';
import { notFoundHandler, errorHandler } from './middleware/error.middleware';
import { apiLimiter } from './middleware/rateLimiter.middleware';
import { sanitizeData } from './middleware/sanitize.middleware';

dotenv.config();

connectDB();

const app: Application = express();
const PORT = process.env.PORT || 5000;


// ============================================
//  SECURITY MIDDLEWARES
// ============================================

// 1. Set Security HTTP Headers
app.use(helmet());

// 2. CORS (Restricting cross-origin requests)
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173', // React Frontend URL (Vite default 5173)
  credentials: true
}));

// 3. Body Parser with Size Limit (Prevents payload flood attacks)
app.use(express.json({ limit: '10kb' }));

app.use(sanitizeData); //  Express 5 safe NoSQL sanitize

// 5. Global Rate Limiting
app.use('/api', apiLimiter);


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
app.use('/api/auth', authRoutes);  

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