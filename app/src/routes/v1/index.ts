import { Router } from 'express';
import authenticateBCToken from '../../middleware/auth';
import products from './products';
import partsBook from './parts-book';

const router = Router();

router.use(authenticateBCToken);

router.use('/products', products);
router.use('/', partsBook);

export default router;
