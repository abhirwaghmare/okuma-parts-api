import express, { Router, Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import config from '../config';

interface WebhookPayload {
    hash?: string;
    data?: unknown;
}

declare global {
    namespace Express {
        interface Request {
            webhookPayload?: WebhookPayload;
        }
    }
}

const router = Router();

// Must parse raw body (not JSON) so we can verify the HMAC signature
router.use(express.raw({ type: 'application/json' }));

function verifySignature(rawBody: Buffer, hash: string | undefined): boolean {
    if (!config.bc.clientSecret || !hash) return false;
    const computed = crypto
        .createHmac('sha256', config.bc.clientSecret)
        .update(rawBody)
        .digest('base64');
    try {
        return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(hash));
    } catch {
        return false;
    }
}

function parseAndVerify(req: Request, res: Response, next: NextFunction): void {
    let payload: WebhookPayload;
    try {
        payload = JSON.parse((req.body as Buffer).toString()) as WebhookPayload;
    } catch {
        res.status(400).json({ error: 'Invalid JSON payload' });
        return;
    }

    if (!verifySignature(req.body as Buffer, payload.hash)) {
        res.status(401).json({ error: 'Invalid webhook signature' });
        return;
    }

    req.webhookPayload = payload;
    next();
}

async function handleOrderWebhook(payload: WebhookPayload | undefined): Promise<void> {
    // TODO: implement order status update logic
    console.info('Order webhook received:', JSON.stringify(payload?.data));
}

router.post('/order', parseAndVerify, (req: Request, res: Response) => {
    // Acknowledge within 5s — heavy processing runs asynchronously
    res.status(200).json({ received: true });
    handleOrderWebhook(req.webhookPayload).catch(err => {
        console.error('Order webhook processing error:', err);
    });
});

export default router;
