import { Schema, model, Document } from 'mongoose';
import bcrypt from 'bcryptjs';

// 1. TypeScript Interface
export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  role: 'customer' | 'admin';
  createdAt: Date;
  updatedAt: Date;
  matchPassword(enteredPassword: string): Promise<boolean>;
}

// 2. Mongoose Schema
const userSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters"]
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true, // Database level uniqueness (Duplicate email match nahi hone dega)
      lowercase: true,
      trim: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, "Please provide a valid email"]
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters"],
      select: false // SECURITY MAGIC: Direct queries mein password field return NAHI hogi!
    },
    role: {
      type: String,
      enum: ['customer', 'admin'],
      default: 'customer'
    }
  },
  {
    timestamps: true
  }
);

//  MONGOOSE HOOK: Save karne se PEHLE Password Hash karo!
userSchema.pre('save', async function (next) {
  // Agar password modify nahi hua (e.g. user ne sirf name update kiya), toh dobara hash mat karo
  if (!this.isModified('password')) {
    return;
  }

  // Salt generate karo & Password Hash karo
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// HELPER METHOD: Entered password ko Hashed Password se Match karne ke liye
userSchema.methods.matchPassword = async function (enteredPassword: string): Promise<boolean> {
  return await bcrypt.compare(enteredPassword, this.password);
};

// 5. Export Model
export const UserModel = model<IUser>('User', userSchema);