import { Request, Response } from 'express';
import { ProductModel } from '../models/product.model';

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
export const createProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    // 💡 NO MANUAL IF/ELSE CHECKS NEEDED! Zod has already validated req.body!
    const { name, price, category, image, description } = req.body;

    const product = await ProductModel.create({
      name: name.trim(),
      price,
      category: category.toLowerCase().trim(),
      image: image || "default.jpg",
      description: description || ""
    });

    res.status(201).json({
      success: true,
      message: "Product created successfully! ✅",
      data: product
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Update product by ID
// @route   PUT /api/products/:id
export const updateProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    // 💡 NO MANUAL IF/ELSE CHECKS NEEDED!
    const product = await ProductModel.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!product) {
      res.status(404).json({ success: false, error: "Product not found" });
      return;
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
    res.status(500).json({ success: false, error: error.message });
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
    res.status(500).json({ success: false, error: error.message });
  }
};