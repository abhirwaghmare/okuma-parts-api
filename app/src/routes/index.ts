import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import authenticateBCToken from '../middleware/auth';
import config from '../config';
import health from './health';
import auth from './auth';
import webhooks from './webhooks';
import v1Router from './v1';
import customer from './customer';
import customers from './customers';
import partsBook from './parts-book';

const router = Router();
// Rate limiter
const apiLimiter = rateLimit({
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later.' },
    validate: { xForwardedForHeader: false },
});
router.use(apiLimiter);
router.use(authenticateBCToken);
// Public routes — not versioned
router.use('/health', health);
router.use('/auth', auth);
router.use('/webhooks', webhooks);

// Versioned API (auth-gated, server-to-server)
router.use('/api/v1', v1Router);

// Public v1 routes
// dealers moved to /api/v1 via v1Router
router.use('/v1', customer);
router.use('/v1', customers);
router.use('/v1', partsBook);

export default router;
