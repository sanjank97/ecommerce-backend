// src/middleware/auth.middleware.ts

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UserModel } from '../models/user.model';

interface JwtPayload {
  id: string;
  role: string;
}

// ============================================
// PROTECT — Only logged-in users
// ============================================
export const 
protect = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    let token: string | undefined;
    //  Authorization header se token nikaalo
    // Format: "Bearer eyJhbGciOiJIUzI1NiIs..."
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      token = req.headers.authorization.split(' ')[1]; // "Bearer" ke baad wala part
    }

    //  Token missing?
    if (!token) {
      res.status(401).json({
        success: false,
        error: 'Not authorized. Please login first.'
      });
      return;
    }

    //  Token verify karo (signature + expiry check)
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET as string
    ) as JwtPayload;

    //  User DB se fetch karo (password ke bina)
    const user = await UserModel.findById(decoded.id);

    if (!user) {
      res.status(401).json({
        success: false,
        error: 'User no longer exists. Token invalid.'
      });
      return;
    }

    //  User ko request object pe attach karo
    // Ab har aage wala controller req.user use kar sakta hai!
    req.user = user;

    next(); // Authorized — controller pe jao
  } catch (error: any) {

    // Token expire / tampered / invalid signature
    res.status(401).json({
      success: false,
      error: 'Not authorized. Token failed or expired.'
    });
  }
};



// ============================================
// AUTHORIZE — Role-Based Access Control (RBAC)
// ============================================
// Usage: authorize('admin') OR authorize('admin', 'manager')
export const authorize = (...allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Safety check: req.user hona zaroori hai (Protect middleware pehle chalna chahiye)
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Not authorized. Please login first.'
      });
      return;
    }

    // Role Check: Kya user ka role allowedRoles array mein include hai?
    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        error: `User role '${req.user.role}' is forbidden from accessing this resource.`
      });
      return;
    }

    // 3️⃣ Access Granted — Admin hai!
    next();
  };
};