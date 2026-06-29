'use strict';

const { Router } = require('express');
const health = require('./health');
const products = require('./products');
const auth = require('./auth');
const webhooks = require('./webhooks');

const router = Router();

router.use('/health', health);
router.use('/api/products', products);
router.use('/auth', auth);
router.use('/webhooks', webhooks);

module.exports = router;
