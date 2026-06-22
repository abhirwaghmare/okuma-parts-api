import { Router, Request, Response } from 'express';
import logger from '../utils/logger';

const router = Router();

router.post('/order', (req: Request, res: Response) => {
  const payload = req.body as Record<string, unknown>;
  logger.info('Webhook received: store/order/statusUpdated', { hash: payload.hash });
  res.sendStatus(200);
});

export default router;
