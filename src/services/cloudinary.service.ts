// src/services/cloudinary.service.ts

/**
 * CLOUDINARY SERVICE
 * ==================
 * Saare Cloudinary operations (upload / delete) ek hi jagah —
 * taaki controllers clean rahein aur logic reusable ho.
 *
 * Flow: Client → Multer (memory storage) → Buffer → Cloudinary stream
 * (Disk pe koi temp file nahi banti — direct RAM se Cloudinary pe jaati hai)
 */

import { UploadApiResponse, UploadApiErrorResponse } from 'cloudinary';
import { v2 as cloudinary } from 'cloudinary';
import { isCloudinaryConfigured } from '../config/cloudinary';
import { ApiError } from '../utils/ApiError';

// Ek uploaded file ki structured info (jo API response me jaayegi)
export interface CloudinaryUploadResult {
  publicId: string;   // Cloudinary public_id — DELETE karne ke liye save karna hota hai
  url: string;        // secure_url — yehi DB/store me save hota hai
  format: string;     // jpg, png, pdf...
  resourceType: string; // image / raw (file) / video
  bytes: number;      // file size in bytes
}

/**
 * Single buffer ko Cloudinary pe upload karo.
 *
 * @param buffer      Multer ka req.file.buffer (memory storage)
 * @param folder      Cloudinary folder (e.g. "ecommerce/products")
 * @param resourceType 'image' → sirf images, 'raw' → docs/files, 'auto' → Cloudinary khud detect kare
 */
export const uploadToCloudinary = (
  buffer: Buffer,
  folder: string,
  resourceType: 'image' | 'raw' | 'auto' = 'auto'
): Promise<CloudinaryUploadResult> => {
  return new Promise((resolve, reject) => {
    // Credentials missing? — turant clear error do (server crash nahi)
    if (!isCloudinaryConfigured()) {
      return reject(
        new ApiError(
          503,
          'Cloudinary is not configured. Add CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET to your .env file.'
        )
      );
    }

    // upload_stream — buffer ko streaming mode me Cloudinary pe bhejta hai
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,                        // Cloudinary dashboard me organized rahega
        resource_type: resourceType,   // image / raw / auto
        unique_filename: true          // random unique filename (filename collisions se bachav)
      },
      (
        error: UploadApiErrorResponse | undefined,
        result: UploadApiResponse | undefined
      ) => {
        if (error || !result) {
          return reject(
            new ApiError(502, `Cloudinary upload failed: ${error?.message || 'No response from Cloudinary'}`)
          );
        }
        resolve({
          publicId: result.public_id,
          url: result.secure_url,
          format: result.format,
          resourceType: result.resource_type,
          bytes: result.bytes
        });
      }
    );

    // Buffer ko stream me pipe karo (memory → Cloudinary, direct)
    stream.end(buffer);
  });
};

/**
 * Multiple files ek saath upload karo (parallel — speed ke liye).
 *
 * Safety: Agar beech me koi file fail ho jaaye, toh jo pehle se upload
 * ho chuki hain unhe Cloudinary se delete kar dete hain — taaki
 * "orphan" files (jinka koi DB record nahi) cloud pe na padi rahein.
 */
export const uploadManyToCloudinary = async (
  buffers: Buffer[],
  folder: string,
  resourceType: 'image' | 'raw' | 'auto' = 'auto'
): Promise<CloudinaryUploadResult[]> => {
  const settled = await Promise.allSettled(
    buffers.map((buffer) => uploadToCloudinary(buffer, folder, resourceType))
  );

  const uploaded = settled
    .filter((r): r is PromiseFulfilledResult<CloudinaryUploadResult> => r.status === 'fulfilled')
    .map((r) => r.value);

  const firstError = settled.find((r) => r.status === 'rejected') as
    | PromiseRejectedResult
    | undefined;

  if (firstError) {
    // Partial cleanup (best-effort — cleanup bhi fail ho sakta hai, ignore karo)
    await Promise.allSettled(
      uploaded.map((file) => cloudinary.uploader.destroy(file.publicId))
    );
    throw firstError.reason; // original error upar propagate karo
  }

  return uploaded;
};

/**
 * Cloudinary se file delete karo (public_id se).
 *
 * @param publicId     Cloudinary public_id (e.g. "ecommerce/products/abc123")
 * @param resourceType 'image' (default) | 'raw' | 'video' — Cloudinary ko batana padta hai
 * @returns Cloudinary result: 'ok' | 'not found' | 'deleted'
 */
export const deleteFromCloudinary = async (
  publicId: string,
  resourceType: 'image' | 'raw' | 'video' = 'image'
): Promise<string> => {
  if (!isCloudinaryConfigured()) {
    throw new ApiError(
      503,
      'Cloudinary is not configured. Add CLOUDINARY_* variables to your .env file.'
    );
  }

  const result = await cloudinary.uploader.destroy(publicId, {
    resource_type: resourceType
  });

  // result.result: 'ok' (deleted) | 'not found' | 'deleted' (already gone)
  return result.result;
};

/**
 * Best-effort delete — product delete/update ke waqt purani image hatane
 * ke liye. Agar delete fail ho jaaye toh request fail NAHI honi chahiye
 * (sirf warning log karo — cloud pe orphan file reh jaayegi, koi crash nahi).
 */
export const deleteFromCloudinarySafe = async (
  publicId: string,
  resourceType: 'image' | 'raw' | 'video' = 'image'
): Promise<void> => {
  try {
    const result = await deleteFromCloudinary(publicId, resourceType);
    console.log(`🗑️  Cloudinary asset deleted: ${publicId} (${result})`);
  } catch (error: any) {
    console.warn(`⚠️  Failed to delete Cloudinary asset "${publicId}": ${error.message}`);
  }
};
