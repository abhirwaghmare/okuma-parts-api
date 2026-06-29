'use strict';

require('dotenv').config();

const config = {
    port: parseInt(process.env.PORT, 10) || 3001,
    sessionSecret: process.env.SESSION_SECRET,
    bc: {
        clientId: process.env.BC_CLIENT_ID,
        clientSecret: process.env.BC_CLIENT_SECRET,
        accessToken: process.env.BC_ACCESS_TOKEN,
        storeHash: process.env.BC_STORE_HASH,
        appCallbackUrl: process.env.BC_APP_CALLBACK_URL,
        apiBaseUrl: `https://api.bigcommerce.com/stores/${process.env.BC_STORE_HASH}`,
    },
};

const required = ['BC_ACCESS_TOKEN', 'BC_STORE_HASH', 'SESSION_SECRET'];
const missing = required.filter(key => !process.env[key]);
if (missing.length) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
}

module.exports = config;
