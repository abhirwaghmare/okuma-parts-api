import { Router } from 'express';
import health from './health';
import auth from './auth';
import webhooks from './webhooks';
import v1Router from './v1';
import dealers from './dealers';
import customer from './customer';
import customers from './customers';
import partsBook from './parts-book';

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
router.use('/', customers);
router.use('/', partsBook);

export default router;
