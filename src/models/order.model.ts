// src/models/order.model.ts

import { Schema, model, Document, Types } from 'mongoose';
import { randomBytes } from 'crypto';

// ============================================
// TYPES & INTERFACES
// ============================================

export type OrderStatus = 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
export type PaymentMethod = 'COD' | 'card' | 'upi';
export type PaymentStatus = 'pending' | 'paid' | 'failed';

export interface IOrderItem {
  product: Types.ObjectId;
  name: string;   // 📸 SNAPSHOT: order time pe product ka naam (product baad me rename/delete ho to bhi order history safe!)
  price: number;  // 📸 SNAPSHOT: checkout time ka price (product price baad me badle to bhi order pe asar nahi)
  quantity: number;
}

export interface IShippingAddress {
  fullName: string;
  phone: string;
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

export interface IOrder extends Document {
  orderNumber: string;
  user: Types.ObjectId;
  items: IOrderItem[];
  totalAmount: number;
  shippingAddress: IShippingAddress;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  orderStatus: OrderStatus;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// HELPERS
// ============================================

// Unique human-readable order number generate karo (e.g. ORD-1715340000000-A3F2)
const generateOrderNumber = (): string => {
  return `ORD-${Date.now()}-${randomBytes(2).toString('hex').toUpperCase()}`;
};

// ============================================
// SUB-SCHEMAS
// ============================================

const orderItemSchema = new Schema<IOrderItem>(
  {
    product: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    price: {
      type: Number,
      required: true,
      min: [0, 'Price cannot be negative']
    },
    quantity: {
      type: Number,
      required: true,
      min: [1, 'Quantity cannot be less than 1'],
      max: [999, 'Quantity cannot be more than 999']
    }
  },
  { _id: false } // Items array me alag _id nahi chahiye
);

const shippingAddressSchema = new Schema<IShippingAddress>(
  {
    fullName: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    street: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    state: { type: String, required: true, trim: true },
    zipCode: { type: String, required: true, trim: true },
    country: { type: String, required: true, trim: true, default: 'India' }
  },
  { _id: false }
);

// ============================================
// MAIN ORDER SCHEMA
// ============================================

const orderSchema = new Schema<IOrder>(
  {
    orderNumber: {
      type: String,
      required: true,
      unique: true,
      default: generateOrderNumber
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true // User ki order history fast fetch karne ke liye
    },
    items: {
      type: [orderItemSchema],
      required: true,
      validate: {
        validator: (items: IOrderItem[]) => items.length > 0,
        message: 'Order must have at least one item'
      }
    },
    totalAmount: {
      type: Number,
      required: true,
      min: [0, 'Total amount cannot be negative'],
      default: 0
    },
    shippingAddress: {
      type: shippingAddressSchema,
      required: true
    },
    paymentMethod: {
      type: String,
      enum: ['COD', 'card', 'upi'],
      default: 'COD'
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'failed'],
      default: 'pending'
    },
    orderStatus: {
      type: String,
      enum: ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'],
      default: 'pending'
    }
  },
  { timestamps: true }
);

// ============================================
// MIDDLEWARE HOOKS
// ============================================

// Pre-validate hook: totalAmount automatically calculate karo (cart model jaisa hi pattern)
// NOTE: 'validate' pe isliye kyunki validation se PEHLE total set ho jaye
orderSchema.pre('validate', function () {
  if (this.isModified('items')) {
    this.totalAmount = this.items.reduce(
      (total, item) => total + item.price * item.quantity,
      0
    );
  }
});

// ============================================
// EXPORT
// ============================================

export const OrderModel = model<IOrder>('Order', orderSchema);
