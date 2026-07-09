import { Router } from 'express';
import products from './products';
import partsBook from './parts-book';
import dealers from '../dealers';

const router = Router();

router.use('/products', products);
router.use('/', partsBook);
router.use('/', dealers);

export default router;
