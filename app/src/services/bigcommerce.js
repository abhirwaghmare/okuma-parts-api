'use strict';

const axios = require('axios');
const config = require('../config');

const bcClient = axios.create({
    baseURL: config.bc.apiBaseUrl,
    headers: {
        'X-Auth-Token': config.bc.accessToken,
        'Content-Type': 'application/json',
        Accept: 'application/json',
    },
    timeout: 10000,
});

bcClient.interceptors.response.use(
    res => res,
    err => {
        const status = err.response?.status;
        const message = err.response?.data?.title || err.message;
        console.error(`BC API error [${status}]: ${message}`);
        return Promise.reject(err);
    }
);

module.exports = bcClient;
