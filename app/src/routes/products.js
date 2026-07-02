'use strict';

const { Router } = require('express');
const bcClient = require('../services/bigcommerce');
const validate = require('../middleware/validate');

const router = Router();

router.get(
    '/',
    validate({
        query: {
            page: { type: 'integer', min: 1 },
            limit: { type: 'integer', min: 1, max: 250 },
            keyword: { type: 'string' },
        },
    }),
    async (req, res, next) => {
        try {
            const page = req.query.page ? parseInt(req.query.page, 10) : 1;
            const limit = req.query.limit ? parseInt(req.query.limit, 10) : 50;
            const { keyword } = req.query;
            const params = { page, limit };
            if (keyword) params.keyword = keyword;

            const { data } = await bcClient.get('/v3/catalog/products', { params });
            res.json(data);
        } catch (err) {
            next(err);
        }
    }
);

router.get(
    '/:id',
    validate({ params: { id: { required: true, type: 'integer', min: 1 } } }),
    async (req, res, next) => {
        try {
            const { data } = await bcClient.get(`/v3/catalog/products/${req.params.id}`);
            res.json(data);
        } catch (err) {
            if (err.response?.status === 404) {
                return res.status(404).json({ error: 'Product not found' });
            }
            next(err);
        }
    }
);

module.exports = router;
