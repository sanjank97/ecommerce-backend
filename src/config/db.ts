// src/config/db.ts
import mongoose from 'mongoose';

export const connectDB = async (): Promise<void> => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI as string);
    console.log(`MongoDB Connected Successfully: ${conn.connection.host}`);
  } catch (error: any) {
    console.error(` MongoDB Connection Error: ${error.message}`);
    process.exit(1); // Server exit kar do agar DB connect na ho sake
  }
};