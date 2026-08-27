import express, { Request, Response } from 'express'
import cors from 'cors'
import dotenv from 'dotenv'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 5000

app.use(cors()) // Middlewares
app.use(express.json()) // JSON request body parse 

interface Product {
  id: number;
  name: string;
  price: number;
  category: string;
  image: string;
  description: string;
}

// In-memory array (MongoDB se replace hoga Month 3 mein)
let products: Product[] = [
  {
    id: 1,
    name: "Wireless Headphones",
    price: 2999,
    category: "electronics",
    image: "headphones.jpg",
    description: "Best noise cancelling headphones"
  },
  {
    id: 2,
    name: "Running Shoes",
    price: 1999,
    category: "fashion",
    image: "shoes.jpg",
    description: "Comfortable running shoes"
  }
];

// 1. GET / root
app.get('/', (req: Request, res: Response) => {
  res.json({ message: ' Node.js + Express Backend Server Running!' })
})
// 2. GET /api/products
app.get('/api/products', (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    count: products.length,
    data: products,
  })
})

// 3. GET /api/products/:id — Fetch Single Product
app.get('/api/products/:id', (req: Request, res: Response) => {
  const id = Number(req.params.id)
  const product = products.find((p) => p.id === id)
  if (!product) {
    return res.status(404).json({ success: false, message: 'Product not found' })
  }
  res.status(200).json({ success: true, data: product })
})

app.post('/api/products', (req: Request, res: Response) => {
  const { name, price, category, image, description } = req.body;
  if (!name || !price || !category) {
    res.status(400).json({ 
      error: "Name, price, and category are required fields" 
    });
    return;
  }
  if (typeof price !== 'number' || price <= 0) {
    res.status(400).json({ 
      error: "Price must be a positive number" 
    });
    return;
  }
  if (name.trim().length < 2) {
    res.status(400).json({ 
      error: "Product name must be at least 2 characters" 
    });
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
    message: "Product created successfully!",
    product: newProduct
  });
});



// PUT Route (Update Product by ID) - 100% Type-Safe
app.put('/api/products/:id', (req: Request, res: Response) => {
  const productId = Number(req.params.id);
  if (isNaN(productId) || !Number.isInteger(productId) || productId <= 0) {
    res.status(400).json({ error: "Invalid product ID. Must be a positive integer." });
    return;
  }
  const productIndex = products.findIndex(p => p.id === productId);
  if (productIndex === -1) {
    res.status(404).json({ error: `Product with ID ${productId} not found` });
    return;
  }
  const existing = products[productIndex];
  if (!existing) {
    res.status(404).json({ error: "Product not found" });
    return;
  }
  if (!req.body || Object.keys(req.body).length === 0) {
    res.status(400).json({ error: "Request body cannot be empty for update" });
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
    res.status(400).json({ error: "Validation failed", details: errors });
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
    message: "Product updated successfully! ✅",
    product: updatedProduct
  });
});




// DELETE Route (Delete Product by ID)

app.delete('/api/products/:id', (req: Request, res: Response) => {
  const productId = Number(req.params.id);
  if (isNaN(productId) || !Number.isInteger(productId) || productId <= 0) {
    res.status(400).json({ error: "Invalid product ID. Must be a positive integer." });
    return;
  }
  const productIndex = products.findIndex(p => p.id === productId);
  if (productIndex === -1) {
    res.status(404).json({ error: `Product with ID ${productId} not found` });
    return;
  }
  const deletedProduct = products[productIndex];
  products.splice(productIndex, 1);
  res.status(200).json({
    message: "Product deleted successfully!",
    deletedProduct: deletedProduct
  });
});



// Server Listening
app.listen(PORT, () => {
  console.log(`⚡ Server running on http://localhost:${PORT}`)
})