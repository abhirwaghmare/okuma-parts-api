import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';

import logger from './utils/logger';
import { errorHandler } from './middleware/errorHandler';
import authRouter from './routes/auth';
import v1Router from './routes/v1';
import webhooksRouter from './routes/webhooks';

const app = express();

// Security headers
app.use(helmet());

// CORS — restrict to storefront origin in production
const allowedOrigins = process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : ['http://localhost:3000'];
app.use(cors({ origin: allowedOrigins, credentials: true }));

// Rate limiting
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
  }),
);

app.use(express.json());

// Routes
app.use('/auth', authRouter);
app.use('/api/v1', v1Router);
app.use('/webhooks', webhooksRouter);

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

// Centralised error handler — must be last
app.use(errorHandler);

const port = process.env.PORT ?? 3000;
app.listen(port, () => {
  logger.info(`App running on port ${port}`, { env: process.env.NODE_ENV ?? 'development' });
});

export default app;
