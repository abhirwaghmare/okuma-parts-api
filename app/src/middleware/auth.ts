import { Request, Response, NextFunction } from 'express';
import { AppError } from './errorHandler';

export function requireApiKey(req: Request, _res: Response, next: NextFunction): void {
  const key = req.headers['x-api-key'];

  if (!process.env.API_KEY) {
    const err: AppError = new Error('API_KEY not configured on server');
    err.statusCode = 500;
    return next(err);
  }

  if (!key || key !== process.env.API_KEY) {
    const err: AppError = new Error('Unauthorized');
    err.statusCode = 401;
    return next(err);
  }

  next();
}
