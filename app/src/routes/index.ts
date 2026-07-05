import { Router } from 'express';
import authenticateBCToken from '../middleware/auth';
import health from './health';
import products from './products';
import auth from './auth';
import webhooks from './webhooks';
import partsBook from './parts-book';

const router = Router();

// Public routes — no auth required
router.use('/health', health);
router.use('/auth', auth);
router.use('/webhooks', webhooks);

// All /api/* routes require a valid X-Auth-Token
router.use('/api', authenticateBCToken);
router.use('/api/products', products);
router.use('/', partsBook);

export default router;
