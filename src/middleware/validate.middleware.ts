import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

export const validate = (schema: ZodSchema) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Validate req.body, req.query, and req.params against Zod schema
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params
      });

      // Pass control to next middleware/controller
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        // Format Zod errors nicely
        const formattedErrors = error.issues.map(err => ({
          field: err.path.join('.').replace('body.', ''),
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