// src/controllers/cart.controller.ts

import { Request, Response } from 'express';
import { CartModel } from '../models/cart.model';
import { ProductModel } from '../models/product.model';

// @desc    Get logged-in user cart
// @route   GET /api/cart
// @access  Private
export const getCart = async (req: Request, res: Response): Promise<void> => {
  try {
    // 🛡️ TYPE GUARD: TS ko confirm karo req.user is available
    if (!req.user) {
      res.status(401).json({ success: false, error: "User not authenticated" });
      return;
    }

    const userId = req.user._id;

    // 🔥 .populate('items.product') => Product details fetch karega
    let cart = await CartModel.findOne({ user: userId }).populate(
      'items.product',
      'name price image category'
    );

    if (!cart) {
      cart = await CartModel.create({ user: userId, items: [], totalAmount: 0 });
    }

    res.status(200).json({
      success: true,
      data: cart
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Add item to cart
// @route   POST /api/cart
// @access  Private
export const addToCart = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: "User not authenticated" });
      return;
    }

    const userId = req.user._id;
    const { productId, quantity = 1 } = req.body;

    if (!productId) {
      res.status(400).json({ success: false, error: "productId is required" });
      return;
    }

    // 1️⃣ Check if product exists
    const product = await ProductModel.findById(productId);
    if (!product) {
      res.status(404).json({ success: false, error: "Product not found" });
      return;
    }

    // 2️⃣ Find user's cart or create new
    let cart = await CartModel.findOne({ user: userId });
    if (!cart) {
      cart = new CartModel({ user: userId, items: [] });
    }

    // 3️⃣ Check if product already in cart
    const itemIndex = cart.items.findIndex(
      item => item.product.toString() === productId
    );

    if (itemIndex > -1) {
      //Existing item variable mein store karke type check karo
      const existingItem = cart.items[itemIndex];
      if (existingItem) {
        existingItem.quantity += Number(quantity);
      }
    } else {
      cart.items.push({
        product: product._id as any,
        quantity: Number(quantity),
        price: product.price
      });
    }

    // 4️⃣ Save Cart
    await cart.save();
    await cart.populate('items.product', 'name price image category');

    res.status(200).json({
      success: true,
      message: "Item added to cart! 🛒",
      data: cart
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Remove single item from cart
// @route   DELETE /api/cart/:productId
// @access  Private
export const removeFromCart = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: "User not authenticated" });
      return;
    }

    const userId = req.user._id;
    const { productId } = req.params;

    const cart = await CartModel.findOne({ user: userId });
    if (!cart) {
      res.status(404).json({ success: false, error: "Cart not found" });
      return;
    }

    cart.items = cart.items.filter(
      item => item.product.toString() !== productId
    );

    await cart.save();
    await cart.populate('items.product', 'name price image category');

    res.status(200).json({
      success: true,
      message: "Item removed from cart 🗑️",
      data: cart
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Clear entire cart
// @route   DELETE /api/cart
// @access  Private
export const clearCart = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: "User not authenticated" });
      return;
    }

    const userId = req.user._id;

    const cart = await CartModel.findOne({ user: userId });
    if (cart) {
      cart.items = [];
      cart.totalAmount = 0;
      await cart.save();
    }

    res.status(200).json({
      success: true,
      message: "Cart cleared 🧹",
      data: cart
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};