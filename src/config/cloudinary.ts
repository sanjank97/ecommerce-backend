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
 */

import { v2 as cloudinary } from 'cloudinary';

// Env values ko locals me nikalo (TypeScript narrowing ke liye bhi)
const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

/**
 * Helper: Kya Cloudinary credentials .env me diye gaye hain?
 * (Server crash hone se bachne ke liye — warn sirf upload karte waqt
 *  clear error milega, baaki API normal chalta rahega)
 */
export const isCloudinaryConfigured = (): boolean => {
  return Boolean(cloudName && apiKey && apiSecret);
};

// Cloudinary ko env variables se configure karo (secure URLs ke sath)
// (Direct condition check — function call se TypeScript narrowing nahi hoti)
if (cloudName && apiKey && apiSecret) {
  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true // http nahi, hamesha https URLs return karo
  });
  console.log(`☁️  Cloudinary configured (cloud: ${cloudName})`);
} else {
  // Boot time pe warning — taaki developer ko yaad rahe creds missing hain
  console.warn(
    '⚠️  Cloudinary is NOT configured! File/Image uploads will fail.\n' +
    '    Add CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET to your .env file.'
  );
}

// Re-export taaki baaki files seedha `cloudinary` import kar sakein
export { cloudinary };

// Humari saari files is folder tree ke andar rahengi (delete safety ke liye bhi)
export const CLOUDINARY_ROOT_FOLDER = 'ecommerce';
