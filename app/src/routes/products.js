'use strict';

const { Router } = require('express');
const bcClient = require('../services/bigcommerce');

const router = Router();

router.get('/', async (req, res, next) => {
    try {
        const { page = 1, limit = 50, keyword } = req.query;
        const params = { page, limit };
        if (keyword) params.keyword = keyword;

        const { data } = await bcClient.get('/v3/catalog/products', { params });
        res.json(data);
    } catch (err) {
        next(err);
    }
});

router.get('/:id', async (req, res, next) => {
    try {
        const { data } = await bcClient.get(`/v3/catalog/products/${req.params.id}`);
        res.json(data);
    } catch (err) {
        if (err.response?.status === 404) {
            return res.status(404).json({ error: 'Product not found' });
        }
        next(err);
    }
});

module.exports = router;
