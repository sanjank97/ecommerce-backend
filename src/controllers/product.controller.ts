import { Request, Response } from 'express';
import { Product } from '../types/product.types';
import { products } from '../data/products.data';


// @desc    Get all products with Search, Filter, Sort & Pagination
// @route   GET /api/products
export const getAllProducts = (req: Request, res: Response): void => {
  // Original array ki shallow copy banate hain taaki original data mutate na ho
  let filteredProducts: Product[] = [...products];

  //  Extract Query Params
  const { search, category, minPrice, maxPrice, sort, page, limit } = req.query;


  // SEARCH FEATURE (by name or description)
  if (search && typeof search === 'string') {
    const keyword = search.toLowerCase().trim();
    filteredProducts = filteredProducts.filter(p =>
      p.name.toLowerCase().includes(keyword) ||
      p.description.toLowerCase().includes(keyword)
    );
  }


  // CATEGORY FILTER
  if (category && typeof category === 'string') {
    filteredProducts = filteredProducts.filter(p =>
      p.category.toLowerCase() === category.toLowerCase().trim()
    );
  }

  //  PRICE RANGE FILTER (minPrice & maxPrice)
  if (minPrice) {
    const min = Number(minPrice);
    if (!isNaN(min)) {
      filteredProducts = filteredProducts.filter(p => p.price >= min);
    }
  }

  if (maxPrice) {
    const max = Number(maxPrice);
    if (!isNaN(max)) {
      filteredProducts = filteredProducts.filter(p => p.price <= max);
    }
  }

  //  SORTING (price_asc, price_desc, name_asc, name_desc)

  if (sort && typeof sort === 'string') {
    switch (sort) {
      case 'price_asc':
        filteredProducts.sort((a, b) => a.price - b.price);
        break;
      case 'price_desc':
        filteredProducts.sort((a, b) => b.price - a.price);
        break;
      case 'name_asc':
        filteredProducts.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'name_desc':
        filteredProducts.sort((a, b) => b.name.localeCompare(a.name));
        break;
      default:
        // Default: Sort by newest/id descending
        filteredProducts.sort((a, b) => b.id - a.id);
    }
  }


  // PAGINATION (Industry Standard Metadata)
  const pageNumber = Math.max(1, Number(page) || 1);          // Default page 1
  const limitNumber = Math.max(1, Number(limit) || 10);       // Default 10 items per page
  const totalProducts = filteredProducts.length;              // Filter hone ke baad total count
  const totalPages = Math.ceil(totalProducts / limitNumber);   // Total pages calculation

  // Calculation for Array Slice
  // Page 1: 0 to 10
  // Page 2: 10 to 20
  const startIndex = (pageNumber - 1) * limitNumber;
  const endIndex = startIndex + limitNumber;
  const paginatedProducts = filteredProducts.slice(startIndex, endIndex);

  // ============================================
  // 🚀 7️⃣ RESPONSE RETURN
  // ============================================
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
    data: paginatedProducts
  });
};

// @desc    Get single product by ID
// @route   GET /api/products/:id
export const getProductById = (req: Request, res: Response): void => {
  const productId = Number(req.params.id);

  if (isNaN(productId) || !Number.isInteger(productId) || productId <= 0) {
    res.status(400).json({ success: false, error: "Invalid product ID format" });
    return;
  }

  const product = products.find(p => p.id === productId);
  if (!product) {
    res.status(404).json({ success: false, error: `Product with ID ${productId} not found` });
    return;
  }

  res.status(200).json({ success: true, data: product });
};

// @desc    Create new product
// @route   POST /api/products
export const createProduct = (req: Request, res: Response): void => {
  if (!req.body || Object.keys(req.body).length === 0) {
    res.status(400).json({ success: false, error: "Request body is empty" });
    return;
  }

  const { name, price, category, image, description } = req.body;
  const errors: string[] = [];

  if (!name || typeof name !== 'string' || name.trim().length < 2) {
    errors.push("Name is required and must be at least 2 characters");
  }
  if (price === undefined || typeof price !== 'number' || price <= 0) {
    errors.push("Price is required and must be a positive number");
  }
  if (!category || typeof category !== 'string' || category.trim().length < 2) {
    errors.push("Category is required and must be at least 2 characters");
  }

  if (errors.length > 0) {
    res.status(400).json({ success: false, error: "Validation failed", details: errors });
    return;
  }

  const newProduct: Product = {
    id: products.length > 0 ? Math.max(...products.map(p => p.id)) + 1 : 1,
    name: name.trim(),
    price,
    category: category.toLowerCase().trim(),
    image: image || "default.jpg",
    description: description || ""
  };

  products.push(newProduct);

  res.status(201).json({
    success: true,
    message: "Product created successfully! ✅",
    data: newProduct
  });
};

// @desc    Update product by ID
// @route   PUT /api/products/:id
export const updateProduct = (req: Request, res: Response): void => {
  const productId = Number(req.params.id);

  if (isNaN(productId) || !Number.isInteger(productId) || productId <= 0) {
    res.status(400).json({ success: false, error: "Invalid product ID format" });
    return;
  }

  const productIndex = products.findIndex(p => p.id === productId);
  if (productIndex === -1) {
    res.status(404).json({ success: false, error: `Product with ID ${productId} not found` });
    return;
  }

  const existing = products[productIndex];
  if (!existing) {
    res.status(404).json({ success: false, error: "Product not found" });
    return;
  }

  const { name, price, category, image, description } = req.body;
  const errors: string[] = [];

  if (name !== undefined && (typeof name !== 'string' || name.trim().length < 2)) {
    errors.push("Name must be at least 2 characters long");
  }
  if (price !== undefined && (typeof price !== 'number' || price <= 0)) {
    errors.push("Price must be a positive number");
  }
  if (category !== undefined && (typeof category !== 'string' || category.trim().length < 2)) {
    errors.push("Category must be at least 2 characters long");
  }

  if (errors.length > 0) {
    res.status(400).json({ success: false, error: "Validation failed", details: errors });
    return;
  }

  const updatedProduct: Product = {
    id: existing.id,
    name: name !== undefined ? name.trim() : existing.name,
    price: price !== undefined ? price : existing.price,
    category: category !== undefined ? category.toLowerCase().trim() : existing.category,
    image: image !== undefined ? image : existing.image,
    description: description !== undefined ? description : existing.description
  };

  products[productIndex] = updatedProduct;

  res.status(200).json({
    success: true,
    message: "Product updated successfully!",
    data: updatedProduct
  });
};

// @desc    Delete product by ID
// @route   DELETE /api/products/:id
export const deleteProduct = (req: Request, res: Response): void => {
  const productId = Number(req.params.id);

  if (isNaN(productId) || !Number.isInteger(productId) || productId <= 0) {
    res.status(400).json({ success: false, error: "Invalid product ID format" });
    return;
  }

  const productIndex = products.findIndex(p => p.id === productId);
  if (productIndex === -1) {
    res.status(404).json({ success: false, error: `Product with ID ${productId} not found` });
    return;
  }

  const deletedProduct = products[productIndex];
  products.splice(productIndex, 1);

  res.status(200).json({
    success: true,
    message: "Product deleted successfully! 🗑️",
    data: deletedProduct
  });
};