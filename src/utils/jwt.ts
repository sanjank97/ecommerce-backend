// src/utils/jwt.ts

import jwt from 'jsonwebtoken';
import { Types } from 'mongoose';

export const generateToken = (userId: Types.ObjectId | string, role: string): string => {
  return jwt.sign(
    { id: userId, role },                         // Payload (Token ke andar kya data chhupa hoga)
    process.env.JWT_SECRET as string,              // Secret Key
    { expiresIn: (process.env.JWT_EXPIRE || '7d') as any } // Expiry Time (7 Days)
  );
};