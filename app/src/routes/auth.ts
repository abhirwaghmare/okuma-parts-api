import { Router, Request, Response } from 'express';

const router = Router();

// OAuth install/callback — wire up BC app OAuth flow here
router.get('/callback', (_req: Request, res: Response) => {
  res.json({ status: 'auth callback not yet implemented' });
});

export default router;
