import { Router, Request, Response, NextFunction } from 'express';
import { getProducts, createProduct } from '../../services/bigcommerce';
import { validateBody } from '../../middleware/validate';

const router = Router();

router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const { data } = await getProducts();
    res.json(data);
  } catch (err) {
    next(err);
  }
});

router.post(
  '/',
  validateBody({ name: { type: 'string', required: true }, price: { type: 'number', required: true } }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { data } = await createProduct(req.body);
      res.status(201).json(data);
    } catch (err) {
      next(err);
    }
  },
);

export default router;
