import { Request, Response } from 'express';
import { ProductModel, IProductImage } from '../models/product.model';
import {
  uploadManyToCloudinary,
  deleteFromCloudinarySafe
} from '../services/cloudinary.service';
import { CLOUDINARY_ROOT_FOLDER } from '../config/cloudinary';

// Helper: req.files se "images" field wali files nikalne ka type-safe tareeka
const getProductFiles = (req: Request): Express.Multer.File[] => {
  const files = req.files as { images?: Express.Multer.File[] } | undefined;
  return files?.images ?? [];
};

// @desc    Get all products (Search, Filter, Sort, Pagination)
// @route   GET /api/products
export const getAllProducts = async (req: Request, res: Response): Promise<void> => {
  try {
    const { search, category, minPrice, maxPrice, sort, page, limit } = req.query;
    const filter: any = {};

    if (search && typeof search === 'string') {
      filter.$or = [
        { name: { $regex: search.trim(), $options: 'i' } },        // 'i' = case-insensitive
        { description: { $regex: search.trim(), $options: 'i' } }
      ];
    }

    // Category filter
    if (category && typeof category === 'string') {
      filter.category = category.toLowerCase().trim();
    }

    // Price range filter
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice); // greater than or equal
      if (maxPrice) filter.price.$lte = Number(maxPrice); // less than or equal
    }

    // 🔃 Sorting
    let sortOption: any = { createdAt: -1 }; // Default: newest first
    if (sort && typeof sort === 'string') {
      switch (sort) {
        case 'price_asc':  sortOption = { price: 1 }; break;
        case 'price_desc': sortOption = { price: -1 }; break;
        case 'name_asc':   sortOption = { name: 1 }; break;
        case 'name_desc':  sortOption = { name: -1 }; break;
      }
    }

    // Pagination
    const pageNumber = Math.max(1, Number(page) || 1); // Current Page
    const limitNumber = Math.max(1, Number(limit) || 10); // LIMIT Per Page
    const skip = (pageNumber - 1) * limitNumber; //OFFSET

    //  Parallel queries — speed ke liye (Promise.all)
    const [products, totalProducts] = await Promise.all([
      ProductModel.find(filter)
        .sort(sortOption)
        .skip(skip)
        .limit(limitNumber),
      ProductModel.countDocuments(filter) // Total Products
    ]);

    const totalPages = Math.ceil(totalProducts / limitNumber); //TOTAL PAGES

    res.status(200).json({
      success: true,
      pagination: {
        totalProducts,
        totalPages,
        currentPage: pageNumber,
        limit: limitNumber,
        hasNextPage: pageNumber < totalPages,
        hasPrevPage: pageNumber > 1
      },
      data: products
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Get single product by ID
// @route   GET /api/products/:id
export const getProductById = async (req: Request, res: Response): Promise<void> => {
  try {
    const product = await ProductModel.findById(req.params.id);

    if (!product) {
      res.status(404).json({ success: false, error: "Product not found" });
      return;
    }

    res.status(200).json({ success: true, data: product });
  } catch (error: any) {
    // Invalid ObjectId format (jaise /api/products/123) pe ye catch hoga
    res.status(400).json({ success: false, error: "Invalid product ID format" });
  }
};

// @desc    Create a new product
// @route   POST /api/products
// Body:    JSON (image as URL) YA multipart/form-data (files in "images" field, max 5)
export const createProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    // 💡 NO MANUAL IF/ELSE CHECKS NEEDED! Zod has already validated req.body!
    const { name, price, category, image, description } = req.body;
    const files = getProductFiles(req);

    // Default image data (agar files nahi aayi toh URL string ya default use hoga)
    let imageData: { image: string; imagePublicId: string; images: IProductImage[] } = {
      image: image || "default.jpg",
      imagePublicId: "",
      images: []
    };

    // 🖼️ Agar multipart/form-data me images aayi hain → Cloudinary pe upload karo
    // (Upload VALIDATION ke baad ho raha hai — invalid product data pe cloud
    //  pe koi orphan file nahi jayegi)
    if (files.length > 0) {
      const uploaded = await uploadManyToCloudinary(
        files.map((f) => f.buffer),
        `${CLOUDINARY_ROOT_FOLDER}/products`,
        'image'
      );

      // Destructuring se pehli image mil jaati hai (files.length > 0 guaranteed)
      const [mainImage] = uploaded;

      if (mainImage) {
        imageData = {
          image: mainImage.url,             // Pehli image = main product image
          imagePublicId: mainImage.publicId, // Delete/replace ke liye save
          images: uploaded.map((u) => ({ url: u.url, publicId: u.publicId })) // Poori gallery
        };
      }
    }

    const product = await ProductModel.create({
      name: name.trim(),
      price,
      category: category.toLowerCase().trim(),
      description: description || "",
      ...imageData
    });

    res.status(201).json({
      success: true,
      message: "Product created successfully! ✅",
      data: product
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ success: false, error: error.message });
  }
};

// @desc    Update product by ID
// @route   PUT /api/products/:id
// Body:    JSON (fields + image URL) YA multipart/form-data (naye "images" files)
export const updateProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    // 💡 NO MANUAL IF/ELSE CHECKS NEEDED!
    const { name, price, category, image, description } = req.body;
    const files = getProductFiles(req);

    // Purana product pehle fetch karo — 404 check + purani Cloudinary
    // image cleanup ke liye (findByIdAndUpdate old values nahi deta)
    const existing = await ProductModel.findById(req.params.id);

    if (!existing) {
      res.status(404).json({ success: false, error: "Product not found" });
      return;
    }

    // 🔒 EXPLICIT FIELD PICKING (mass-assignment protection) —
    // req.body ka koi bhi random field (jaise role/createdAt) DB tak nahi jaayega
    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name.trim();
    if (price !== undefined) updateData.price = price;
    if (category !== undefined) updateData.category = category.toLowerCase().trim();
    if (description !== undefined) updateData.description = description;
    // Note: image = "" wala empty-sentinel (sirf-files request) yahan ignore hota hai
    if (image) updateData.image = image;

    // 🖼️ Naye images upload (validation ke baad — no orphan cloud files)
    if (files.length > 0) {
      const uploaded = await uploadManyToCloudinary(
        files.map((f) => f.buffer),
        `${CLOUDINARY_ROOT_FOLDER}/products`,
        'image'
      );

      const [mainImage] = uploaded; // pehli image = nayi main image

      if (mainImage) {
        updateData.image = mainImage.url;
        updateData.imagePublicId = mainImage.publicId;
        updateData.images = uploaded.map((u) => ({ url: u.url, publicId: u.publicId }));
      }
    }

    if (Object.keys(updateData).length === 0) {
      res.status(400).json({
        success: false,
        error: "Nothing to update. Provide at least one field or upload images."
      });
      return;
    }

    const product = await ProductModel.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!product) {
      res.status(404).json({ success: false, error: "Product not found" });
      return;
    }

    // 🧹 PURANI image Cloudinary se delete karo (best-effort — agar ye fail
    // ho jaaye toh bhi update successful rahega, sirf warning log hogi)
    if (files.length > 0 && existing.imagePublicId) {
      await deleteFromCloudinarySafe(existing.imagePublicId);
    }

    res.status(200).json({
      success: true,
      message: "Product updated successfully! ✅",
      data: product
    });
  } catch (error: any) {
    if (error.name === 'CastError') {
      res.status(400).json({ success: false, error: "Invalid product ID format" });
      return;
    }
    res.status(error.statusCode || 500).json({ success: false, error: error.message });
  }
};

// @desc    Delete product by ID
// @route   DELETE /api/products/:id
export const deleteProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const product = await ProductModel.findByIdAndDelete(req.params.id);

    if (!product) {
      res.status(404).json({ success: false, error: "Product not found" });
      return;
    }

    // 🧹 Product ki SAARI Cloudinary images delete karo (best-effort) —
    // warna cloud pe orphan files jama hoti rehti hain (free storage khatam!)
    // Set use kiya hai taaki main image + gallery me duplicate na ho
    const publicIds = new Set<string>();
    if (product.imagePublicId) publicIds.add(product.imagePublicId);
    product.images?.forEach((img) => {
      if (img.publicId) publicIds.add(img.publicId);
    });

    if (publicIds.size > 0) {
      await Promise.all([...publicIds].map((publicId) => deleteFromCloudinarySafe(publicId)));
    }

    res.status(200).json({
      success: true,
      message: "Product deleted successfully! 🗑️",
      data: product
    });
  } catch (error: any) {
    if (error.name === 'CastError') {
      res.status(400).json({ success: false, error: "Invalid product ID format" });
      return;
    }
    res.status(error.statusCode || 500).json({ success: false, error: error.message });
  }
};