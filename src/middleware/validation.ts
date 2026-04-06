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
    // Validate email: one @, non-empty local part, domain with at least one dot
    // Using indexOf/lastIndexOf instead of complex regex to avoid ReDoS
    if (email) {
      const atIdx = (email as string).indexOf('@');
      const lastAtIdx = (email as string).lastIndexOf('@');
      const dotAfterAt = atIdx > 0 ? (email as string).indexOf('.', atIdx + 2) : -1;
      const hasSpaces = /\s/.test(email as string);
      const isValid =
        !hasSpaces &&
        atIdx > 0 &&
        atIdx === lastAtIdx &&
        dotAfterAt > atIdx + 1 &&
        dotAfterAt < (email as string).length - 1;
      if (!isValid) {
        res.status(400).json({ success: false, error: `Invalid email format for field: ${field}` });
        return;
      }
    }
    next();
  };
}
