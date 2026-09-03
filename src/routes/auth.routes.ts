// src/routes/auth.routes.ts

import { Router } from 'express';
import { registerUser, loginUser, getMe } from '../controllers/auth.controller';
import { validate } from '../middleware/validate.middleware';
import { registerSchema, loginSchema } from '../validations/auth.validation';
import { protect } from '../middleware/auth.middleware'; 
import { authLimiter } from '../middleware/rateLimiter.middleware';


const router = Router();

router.post('/register',authLimiter, validate(registerSchema), registerUser);
router.post('/login',authLimiter, validate(loginSchema), loginUser);
router.get('/me', protect, getMe);

export default router;