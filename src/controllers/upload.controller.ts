// src/controllers/upload.controller.ts

/**
 * UPLOAD CONTROLLER
 * =================
 * Multer ne files RAM me parse kar di hain (req.file / req.files) —
 * ab hum unhe Cloudinary pe upload karke URL return karte hain.
 *
 * Endpoints (sab admin-only):
 *   POST /api/uploads/image           → single image   (field: "image")
 *   POST /api/uploads/product-images  → max 5 images   (field: "images")
 *   POST /api/uploads/file            → pdf/doc/zip... (field: "file")
 *   POST /api/uploads/destroy         → Cloudinary asset delete (JSON body)
 *
 * Client flow (decoupled architecture):
 *   1. Pehle yahan upload karo → URL + publicId milega
 *   2. Phir us URL se product create/update karo (JSON body)
 */

import { Request, Response } from 'express';
import {
  uploadToCloudinary,
  uploadManyToCloudinary,
  deleteFromCloudinary
} from '../services/cloudinary.service';
import { CLOUDINARY_ROOT_FOLDER } from '../config/cloudinary';
import { ApiError } from '../utils/ApiError';

// ============================================
// 1. SINGLE IMAGE UPLOAD
// POST /api/uploads/image  (form-data, field: "image")
// ============================================
export const uploadImage = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      throw new ApiError(400, 'No file uploaded. Attach an image in form-data field named "image".');
    }

    const result = await uploadToCloudinary(
      req.file.buffer,
      `${CLOUDINARY_ROOT_FOLDER}/images`,
      'image'
    );

    res.status(200).json({
      success: true,
      message: 'Image uploaded successfully! ✅',
      data: result
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ success: false, error: error.message });
  }
};

// ============================================
// 2. PRODUCT IMAGES UPLOAD (batch)
// POST /api/uploads/product-images  (form-data, field: "images", max 5)
// ============================================
export const uploadProductImages = async (req: Request, res: Response): Promise<void> => {
  try {
    const files = (req.files as { images?: Express.Multer.File[] } | undefined)?.images;

    if (!files || files.length === 0) {
      throw new ApiError(400, 'No files uploaded. Attach images in form-data field named "images" (max 5).');
    }

    const results = await uploadManyToCloudinary(
      files.map((f) => f.buffer),
      `${CLOUDINARY_ROOT_FOLDER}/products`,
      'image'
    );

    res.status(200).json({
      success: true,
      message: `${results.length} product image(s) uploaded successfully! ✅`,
      count: results.length,
      data: results
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ success: false, error: error.message });
  }
};

// ============================================
// 3. GENERIC FILE UPLOAD (pdf, doc, zip...)
// POST /api/uploads/file  (form-data, field: "file")
// ============================================
export const uploadFile = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      throw new ApiError(400, 'No file uploaded. Attach a file in form-data field named "file".');
    }

    const result = await uploadToCloudinary(
      req.file.buffer,
      `${CLOUDINARY_ROOT_FOLDER}/files`,
      'auto' // Cloudinary khud detect karega: image ya raw file
    );

    res.status(200).json({
      success: true,
      message: 'File uploaded successfully! ✅',
      data: result
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ success: false, error: error.message });
  }
};

// ============================================
// 4. DELETE UPLOADED ASSET
// POST /api/uploads/destroy  (JSON: { publicId, resourceType? })
// ============================================
export const deleteUpload = async (req: Request, res: Response): Promise<void> => {
  try {
    const { publicId, resourceType } = req.body;

    // 🔒 SAFETY: Sirf humare apne app folder ke andar wali files delete ho sakti hain
    // (Koi admin bhi Cloudinary ke dusre folders nahi maar sakta is API se)
    if (!publicId.startsWith(`${CLOUDINARY_ROOT_FOLDER}/`)) {
      throw new ApiError(403, `Forbidden. Only assets under "${CLOUDINARY_ROOT_FOLDER}/" folder can be deleted from this API.`);
    }

    const result = await deleteFromCloudinary(publicId, resourceType);

    if (result === 'not found') {
      throw new ApiError(404, `No Cloudinary asset found with publicId "${publicId}".`);
    }

    res.status(200).json({
      success: true,
      message: 'File deleted successfully! 🗑️',
      data: { publicId, result }
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ success: false, error: error.message });
  }
};
