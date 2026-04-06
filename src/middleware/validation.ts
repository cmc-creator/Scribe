import { Request, Response, NextFunction } from 'express';

export function validateBody(requiredFields: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const missing = requiredFields.filter(
      (field) => req.body[field] === undefined || req.body[field] === null || req.body[field] === ''
    );
    if (missing.length > 0) {
      res.status(400).json({
        success: false,
        error: `Missing required fields: ${missing.join(', ')}`,
      });
      return;
    }
    next();
  };
}

export function validateEmail(field: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const email = req.body[field];
    // Simple email format check - deliberately permissive to avoid ReDoS
    const emailRegex = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
    if (email && !emailRegex.test(email)) {
      res.status(400).json({ success: false, error: `Invalid email format for field: ${field}` });
      return;
    }
    next();
  };
}
