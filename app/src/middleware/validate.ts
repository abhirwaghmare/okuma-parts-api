import { Request, Response, NextFunction } from 'express';
import { AppError } from './errorHandler';

type Schema = Record<string, { type: string; required?: boolean }>;

export function validateBody(schema: Schema) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const missing: string[] = [];
    const invalid: string[] = [];

    for (const [field, rules] of Object.entries(schema)) {
      const value = (req.body as Record<string, unknown>)[field];
      if (rules.required && (value === undefined || value === null || value === '')) {
        missing.push(field);
      } else if (value !== undefined && typeof value !== rules.type) {
        invalid.push(`${field} must be ${rules.type}`);
      }
    }

    if (missing.length || invalid.length) {
      const messages = [
        ...(missing.length ? [`Missing required fields: ${missing.join(', ')}`] : []),
        ...invalid,
      ];
      const err: AppError = new Error(messages.join('. '));
      err.statusCode = 400;
      return next(err);
    }

    next();
  };
}
