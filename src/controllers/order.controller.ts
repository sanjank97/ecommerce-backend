// src/controllers/order.controller.ts

import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { OrderModel, IOrderItem } from '../models/order.model';
import { CartModel } from '../models/cart.model';
import { ProductModel } from '../models/product.model';

// Helper: order access check — owner ya admin hi dekh sake
const canAccess = (orderUser: Types.ObjectId, reqUser: { _id: Types.ObjectId; role: string }): boolean => {
  return orderUser.toString() === reqUser._id.toString() || reqUser.role === 'admin';
};

// @desc    Checkout — Cart se Order banao (Order Creation Engine)
// @route   POST /api/orders
// @access  Private
export const createOrder = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'User not authenticated' });
      return;
    }

    const userId = req.user._id;
    // zod schema me validate ho chuka hai (defaults apply: country 'India', paymentMethod 'COD')
    const { shippingAddress, paymentMethod } = req.body;

    // 1️⃣ User ka cart fetch karo
    const cart = await CartModel.findOne({ user: userId });
    if (!cart || cart.items.length === 0) {
      res.status(400).json({ success: false, error: 'Cart is empty. Order banane se pehle kuch items add karo! 🛒' });
      return;
    }

    // 2️⃣ Saare cart products abhi bhi exist karte hain? (deleted product guard)
    const productIds = cart.items.map(item => item.product);
    const products = await ProductModel.find({ _id: { $in: productIds } });

    // 3️⃣ Order items banao — 📸 CHECKOUT-TIME PRICE SNAPSHOT
    // Cart me add karne ke baad product ka price badla ho to order me CURRENT price use hota hai
    const orderItems: IOrderItem[] = [];

    for (const item of cart.items) {
      const product = products.find(p => item.product.equals(p._id as Types.ObjectId));

      if (!product) {
        res.status(400).json({
          success: false,
          error: `Product ab available nahi hai (id: ${item.product.toString()}). Usse cart se hatao aur dobara try karo.`
        });
        return;
      }

      orderItems.push({
        product: product._id as Types.ObjectId,
        name: product.name,     // snapshot — history ke liye
        price: product.price,   // checkout time ka price
        quantity: item.quantity
      });
    }

    // 4️⃣ Order create karo (totalAmount model ke pre-validate hook me auto-calculate hota hai)
    const order = await OrderModel.create({
      user: userId,
      items: orderItems,
      shippingAddress,
      paymentMethod
    });

    // 5️⃣ Checkout complete — Cart clear karo
    // NOTE: Transaction-free approach (standalone local MongoDB bhi support kare):
    // pehle ORDER create (important data safe), phir cart clear.
    // Agar cart clear fail ho jaye to order phir bhi safe hai — user cart manually clear kar sakta hai.
    cart.items = [];
    cart.totalAmount = 0;
    await cart.save();

    // 6️⃣ Populated response bhejo
    await order.populate('items.product', 'name price image category');

    res.status(201).json({
      success: true,
      message: 'Order placed successfully! 🎉',
      data: order
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Get logged-in user ki order history (paginated)
// @route   GET /api/orders/my-orders
// @access  Private
export const getMyOrders = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'User not authenticated' });
      return;
    }

    const userId = req.user._id;
    const pageNumber = Math.max(1, Number(req.query.page) || 1);
    const limitNumber = Math.max(1, Number(req.query.limit) || 10);
    const skip = (pageNumber - 1) * limitNumber;

    const filter = { user: userId };

    const [orders, totalOrders] = await Promise.all([
      OrderModel.find(filter)
        .sort({ createdAt: -1 }) // newest first
        .skip(skip)
        .limit(limitNumber)
        .populate('items.product', 'name price image category'),
      OrderModel.countDocuments(filter)
    ]);

    const totalPages = Math.ceil(totalOrders / limitNumber);

    res.status(200).json({
      success: true,
      pagination: {
        totalOrders,
        totalPages,
        currentPage: pageNumber,
        limit: limitNumber,
        hasNextPage: pageNumber < totalPages,
        hasPrevPage: pageNumber > 1
      },
      data: orders
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Get single order by ID (owner ya admin hi)
// @route   GET /api/orders/:id
// @access  Private
export const getOrderById = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'User not authenticated' });
      return;
    }

    const order = await OrderModel.findById(req.params.id).populate(
      'items.product',
      'name price image category'
    );

    if (!order) {
      res.status(404).json({ success: false, error: 'Order not found' });
      return;
    }

    // 🔒 Ownership check: dusre user ka order nahi dekh sakte (admin exempt)
    if (!canAccess(order.user, req.user)) {
      res.status(403).json({ success: false, error: 'Not authorized to view this order' });
      return;
    }

    res.status(200).json({ success: true, data: order });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Cancel order (user apna pending/confirmed order cancel kar sakta hai)
// @route   PUT /api/orders/:id/cancel
// @access  Private
export const cancelOrder = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'User not authenticated' });
      return;
    }

    const order = await OrderModel.findById(req.params.id);

    if (!order) {
      res.status(404).json({ success: false, error: 'Order not found' });
      return;
    }

    if (!canAccess(order.user, req.user)) {
      res.status(403).json({ success: false, error: 'Not authorized to cancel this order' });
      return;
    }

    // ⛔ Shipped/Delivered order cancel nahi ho sakta
    if (order.orderStatus === 'shipped' || order.orderStatus === 'delivered') {
      res.status(400).json({
        success: false,
        error: `Order already ${order.orderStatus} — ab cancel nahi ho sakta. Delivery ke baad return process use karo.`
      });
      return;
    }

    if (order.orderStatus === 'cancelled') {
      res.status(400).json({ success: false, error: 'Order is already cancelled' });
      return;
    }

    order.orderStatus = 'cancelled';
    await order.save();

    res.status(200).json({
      success: true,
      message: 'Order cancelled successfully ❌',
      data: order
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Get ALL orders (Admin only, paginated + status filter)
// @route   GET /api/orders
// @access  Private/Admin
export const getAllOrders = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'User not authenticated' });
      return;
    }

    const { status, page, limit } = req.query;
    const filter: Record<string, unknown> = {};

    // Optional status filter: /api/orders?status=pending
    const validStatuses = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];
    if (status && typeof status === 'string' && validStatuses.includes(status)) {
      filter.orderStatus = status;
    }

    const pageNumber = Math.max(1, Number(page) || 1);
    const limitNumber = Math.max(1, Number(limit) || 10);
    const skip = (pageNumber - 1) * limitNumber;

    const [orders, totalOrders] = await Promise.all([
      OrderModel.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNumber)
        .populate('items.product', 'name price image category')
        .populate('user', 'name email'), // Admin ko user info dikhao
      OrderModel.countDocuments(filter)
    ]);

    const totalPages = Math.ceil(totalOrders / limitNumber);

    res.status(200).json({
      success: true,
      pagination: {
        totalOrders,
        totalPages,
        currentPage: pageNumber,
        limit: limitNumber,
        hasNextPage: pageNumber < totalPages,
        hasPrevPage: pageNumber > 1
      },
      data: orders
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Update order status (Admin only — order lifecycle engine)
// @route   PUT /api/orders/:id/status
// @access  Private/Admin
export const updateOrderStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'User not authenticated' });
      return;
    }

    const { orderStatus } = req.body;

    const order = await OrderModel.findById(req.params.id);

    if (!order) {
      res.status(404).json({ success: false, error: 'Order not found' });
      return;
    }

    // ⛔ FINAL STATES: cancelled/delivered orders lock ho jate hain
    if (order.orderStatus === 'cancelled') {
      res.status(400).json({ success: false, error: 'Cancelled order ki status change nahi ho sakti' });
      return;
    }
    if (order.orderStatus === 'delivered') {
      res.status(400).json({ success: false, error: 'Delivered order is final — status change nahi ho sakta' });
      return;
    }

    order.orderStatus = orderStatus;

    // 💡 COD order deliver ho gaya = payment received
    if (orderStatus === 'delivered' && order.paymentMethod === 'COD') {
      order.paymentStatus = 'paid';
    }

    await order.save();
    await order.populate('items.product', 'name price image category');

    res.status(200).json({
      success: true,
      message: `Order status updated to '${orderStatus}' ✅`,
      data: order
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};
