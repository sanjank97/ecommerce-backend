// src/config/cloudinary.ts

/***
 * CLOUDINARY CONFIGURATION
 * ========================
 * Cloudinary ek cloud-based media (image/file) storage service hai.
 * Hum isko product images aur files store karne ke liye use kar rahe hain.
 *
 * Setup (Dashboard -> Settings -> API Keys):
 *   1. https://cloudinary.com pe free account banao
 *   2. Dashboard se Cloud name, API Key aur API Secret copy karo
 *   3. .env file me daalo:
 *
 *      CLOUDINARY_CLOUD_NAME=your_cloud_name
 *      CLOUDINARY_API_KEY=your_api_key
 *      CLOUDINARY_API_SECRET=your_api_secret
 *
 * ⚠️  API Secret KABHI git me commit mat karna (.env already gitignored hai)
 *
 * ⚠️  ARCHITECTURE NOTE (BUG FIX):
 *  Import hoisting ki wajah se koi bhi module apna top-level code
 *  `dotenv.config()` se PEHLE chala jaata hai (server.ts me dotenv baad me
 *  call hota hai, lekin imports sabse pehle execute hote hain).
 *  Pehle ye file env values module-load time pe padh rahi thi — tab tak
 *  .env load nahi hua hota, isliye values daalne ke baad bhi warning aati thi.
 *
 *  FIX: Ab env values LAZILY read hoti hain (call time pe) — pehli upload
 *  need pe configure hota hai, tab tak dotenv hamesha loaded ho chuka hota hai.
 */

import { v2 as cloudinary } from 'cloudinary';

// Humari saari files is folder tree ke andar rahengi (delete safety ke liye bhi)
export const CLOUDINARY_ROOT_FOLDER = 'ecommerce';

// Internal cache — SDK ek hi baar configure hota hai
let isConfigured = false;

/**
 * Kya Cloudinary credentials .env me diye gaye hain?
 * (Call time pe FRESH check hota hai — dotenv ke baad accurate jawab dega)
 */
export const isCloudinaryConfigured = (): boolean => {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  );
};

/**
 * Cloudinary SDK ko configure karo — LAZY (pehli zaroorat pe hi).
 *
 * - dotenv.config() ke baad kabhi bhi call karo — hamesha sahi values milti hain
 * - Ek baar configure hone ke baad cache ho jaata hai (repeated calls fast)
 *
 * @returns true = configure ho gaya, false = credentials missing/empty
 */
export const ensureCloudinaryConfig = (): boolean => {
  if (isConfigured) return true; // already configured

  // Locals me nikalo — TypeScript narrowing ke liye zaroori
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!(cloudName && apiKey && apiSecret)) {
    return false; // .env me values missing ya empty hain
  }

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true // http nahi, hamesha https URLs return karo
  });

  isConfigured = true;
  return true;
};

/**
 * Boot-time status message — server.ts me dotenv.config() ke BAAD call hota hai.
 * Agar values missing hain to exact kaunsa variable missing hai wo bhi batata hai.
 */
export const logCloudinaryStatus = (): void => {
  if (ensureCloudinaryConfig()) {
    console.log(`☁️  Cloudinary configured (cloud: ${process.env.CLOUDINARY_CLOUD_NAME})`);
  } else {
    // Kaunse variables missing hain — clear batao (typo/empty value debugging easy)
    const missing = [
      !process.env.CLOUDINARY_CLOUD_NAME && 'CLOUDINARY_CLOUD_NAME',
      !process.env.CLOUDINARY_API_KEY && 'CLOUDINARY_API_KEY',
      !process.env.CLOUDINARY_API_SECRET && 'CLOUDINARY_API_SECRET'
    ].filter(Boolean).join(', ');

    console.warn(
      `⚠️  Cloudinary is NOT configured! Missing/empty: ${missing}\n` +
      '    Add these to your .env file and restart the server.'
    );
  }
};

// Re-export taaki baaki files seedha `cloudinary` import kar sakein
export { cloudinary };
