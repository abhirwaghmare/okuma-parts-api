import { Router } from 'express';
import health from './health';
import products from './products';
import auth from './auth';
import webhooks from './webhooks';
import partsBook from './parts-book';
import customers from './customers';

const router = Router();

router.use('/health', health);
router.use('/api/products', products);
router.use('/auth', auth);
router.use('/webhooks', webhooks);
router.use('/', partsBook);
router.use('/', customers);

export default router;
