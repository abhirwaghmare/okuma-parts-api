import { Router } from 'express';
import products from './products';
import partsBook from './parts-book';

const router = Router();

router.use('/products', products);
router.use('/', partsBook);

export default router;
