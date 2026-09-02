// src/controllers/auth.controller.ts

import { Request, Response } from 'express';
import { UserModel } from '../models/user.model';
import { generateToken } from '../utils/jwt';

// @desc    Register new user
// @route   POST /api/auth/register
export const registerUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, password, role } = req.body;

    // Check if user already exists
    const userExists = await UserModel.findOne({ email: email.toLowerCase() });
    if (userExists) {
      res.status(400).json({
        success: false,
        error: "User already exists with this email address"
      });
      return;
    }

    //  Create user (Password automatically hash ho jayega schema pre-save hook se)
    const user = await UserModel.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password,
      role: role || 'customer'
    });

    //  JWT Token Generate Karo
    const token = generateToken(user._id, user.role);

    // Response Return Karo (Password hash response me NAHI jayega)
    res.status(201).json({
      success: true,
      message: "User registered successfully! 🎉",
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        token
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
export const loginUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;
    //  User ko check karo email se (+password required explicitly because select: false)
    const user = await UserModel.findOne({ email: email.toLowerCase() }).select('+password');

    if (!user) {
      res.status(401).json({
        success: false,
        error: "Invalid email or password"
      });
      return;
    }

    //  Password match check karo
    const isPasswordMatch = await user.matchPassword(password);
    if (!isPasswordMatch) {
      res.status(401).json({
        success: false,
        error: "Invalid email or password"
      });
      return;
    }

    //  JWT Token Generate Karo
    const token = generateToken(user._id, user.role);

    //  Response Return Karo
    res.status(200).json({
      success: true,
      message: "Login successful!",
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        token
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};


// @desc    Get current logged-in user profile
// @route   GET /api/auth/me
// @access  Private (protect middleware chahiye)
export const getMe = async (req: Request, res: Response): Promise<void> => {
  try {
    // protect middleware ne pehle hi req.user set kar diya hai
    res.status(200).json({
      success: true,
      data: req.user
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};