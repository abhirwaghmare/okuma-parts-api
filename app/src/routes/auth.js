'use strict';

const { Router } = require('express');
const axios = require('axios');
const config = require('../config');
const validate = require('../middleware/validate');

const router = Router();

// BC OAuth 2.0 callback — exchange code for permanent access token
router.get(
    '/callback',
    validate({ query: { code: { required: true }, context: { required: true } } }),
    async (req, res, next) => {
        const { code, scope, context } = req.query;

        try {
            const { data } = await axios.post('https://login.bigcommerce.com/oauth2/token', {
                client_id: config.bc.clientId,
                client_secret: config.bc.clientSecret,
                code,
                scope,
                context,
                grant_type: 'authorization_code',
                redirect_uri: config.bc.appCallbackUrl,
            });

            // TODO: persist data.access_token and data.context (store_hash) to your data store
            console.info('OAuth install complete for store:', data.context);
            res.json({ installed: true, context: data.context });
        } catch (err) {
            next(err);
        }
    }
);

module.exports = router;
