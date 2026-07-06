import { Router } from 'express';
import health from './health';
import auth from './auth';
import webhooks from './webhooks';
import v1Router from './v1';

const router = Router();

// Public routes — not versioned
router.use('/health', health);
router.use('/auth', auth);
router.use('/webhooks', webhooks);

// Versioned API
router.use('/api/v1', v1Router);

export default router;
