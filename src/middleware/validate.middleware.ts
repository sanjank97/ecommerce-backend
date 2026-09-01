// src/middleware/validate.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodError } from 'zod';

export const validate = (schema: AnyZodObject) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Validate req.body, req.query, and req.params against Zod schema
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params
      });

      // Agar validation pass ho jaye, next middleware/controller pe jao
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        // Zod error messages ko ek clean array mein format karo
        const formattedErrors = error.errors.map(err => ({
          field: err.path.join('.').replace('body.', ''), // e.g. "price" instead of "body.price"
          message: err.message
        }));

        res.status(400).json({
          success: false,
          error: "Validation failed",
          details: formattedErrors
        });
        return;
      }

      next(error);
    }
  };
};