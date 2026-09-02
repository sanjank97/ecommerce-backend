// src/types/express.d.ts

import { IUser } from '../models/user.model';

declare global {
  namespace Express {
    interface Request {
      user?: IUser; // 👈 Ab req.user TypeScript mein available hoga
    }
  }
}

export {}; // File ko module banane ke liye zaroori