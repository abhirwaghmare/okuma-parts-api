'use strict';

const { Router } = require('express');
const bodyParser = require('express').raw;
const crypto = require('crypto');
const config = require('../config');

const router = Router();

// Must parse raw body (not JSON) so we can verify the HMAC signature
router.use(bodyParser({ type: 'application/json' }));

function verifySignature(rawBody, hash) {
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

function parseAndVerify(req, res, next) {
    let payload;
    try {
        payload = JSON.parse(req.body);
    } catch {
        return res.status(400).json({ error: 'Invalid JSON payload' });
    }

    if (!verifySignature(req.body, payload.hash)) {
        return res.status(401).json({ error: 'Invalid webhook signature' });
    }

    req.webhookPayload = payload;
    next();
}

router.post('/order', parseAndVerify, (req, res) => {
    // Acknowledge within 5s — heavy processing runs asynchronously
    res.status(200).json({ received: true });
    handleOrderWebhook(req.webhookPayload).catch(err => {
        console.error('Order webhook processing error:', err);
    });
});

async function handleOrderWebhook(payload) {
    // TODO: implement order status update logic
    console.info('Order webhook received:', JSON.stringify(payload.data));
}

module.exports = router;
