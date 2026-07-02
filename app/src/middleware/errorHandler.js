'use strict';

const logger = require('../config/logger');

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
    const status = err.status || err.response?.status || 500;
    const message = status < 500 ? err.message : 'Internal server error';

    if (status >= 500) {
        logger.error('Unhandled error', { message: err.message, stack: err.stack });
    }

    res.status(status).json({ error: message });
}

module.exports = errorHandler;
