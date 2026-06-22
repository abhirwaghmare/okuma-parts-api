import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

export interface AppError extends Error {
  statusCode?: number;
}

export function errorHandler(
  err: AppError,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const statusCode = err.statusCode ?? 500;
  logger.error(err.message, { stack: err.stack, statusCode });

  res.status(statusCode).json({
    error: statusCode < 500 ? err.message : 'Internal server error',
  });
}
