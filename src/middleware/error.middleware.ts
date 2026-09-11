import { Request, Response, NextFunction } from 'express';

// 404 Route Not Found Handler
export const notFoundHandler = (req: Request, res: Response): void => {
  res.status(404).json({
    success: false,
    error: `Route not found: ${req.method} ${req.originalUrl}`
  });
};

// Global Error Handler
export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  console.error(" Global Error Caught:", err.message);

  // JSON syntax error handling (e.g. malformed body)
  if (err instanceof SyntaxError && 'body' in err) {
    res.status(400).json({
      success: false,
      error: "Invalid JSON format in request body. Check commas and quotes!"
    });
    return;
  }

  // 413 Payload Too Large — global express.json() ka 10kb limit cross hua
  // (File/image uploads isse guzarti NAHI hain — wo multipart/form-data
  //  jaati hain aur Multer handle karta hai. Ye error ka matlab hai ki
  //  request JSON Content-Type ke sath bheji gayi hai — Postman me
  //  Body → form-data (key type: File) use karo, ya manually set
  //  Content-Type: application/json header hata do)
  if (err.status === 413 || err.type === 'entity.too.large') {
    res.status(413).json({
      success: false,
      error: "Request body too large! JSON body limit sirf 10kb hai. File/image upload ke liye Body → form-data use karo (key type: File) aur Content-Type header manually set mat karo — client khud multipart set karega. (Upload limits: image 5MB, any file 10MB)"
    });
    return;
  }

  // err.statusCode → humare ApiError / Multer errors se aata hai
  // err.status      → Express body-parser errors se aata hai (jaise 413 payload too large)
  const statusCode = err.statusCode || err.status || 500;
  res.status(statusCode).json({
    success: false,
    error: err.message || "Internal Server Error",
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};