import { Router } from 'express';
import health from './health';
import auth from './auth';
import webhooks from './webhooks';
import v1Router from './v1';
// eslint-disable-next-line @typescript-eslint/no-var-requires
import dealers from './dealers';
// eslint-disable-next-line @typescript-eslint/no-var-requires
import customer from './customer';

const router = Router();

// Public routes — not versioned
router.use('/health', health);
router.use('/auth', auth);
router.use('/webhooks', webhooks);

// Versioned API
router.use('/api/v1', v1Router);

// Customer and dealer routes
router.use('/', dealers);
router.use('/', customer);

export default router;
