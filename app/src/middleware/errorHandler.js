'use strict';

const { AppError, ValidationError } = require('./errors');

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
    if (err instanceof ValidationError) {
        return res.status(400).json({ error: err.message, details: err.details });
    }

    if (err instanceof AppError) {
        return res.status(err.status).json({ error: err.message });
    }

    const status = err.status || err.response?.status || 500;
    const message = status < 500 ? err.message : 'Internal server error';

    if (status >= 500) {
        console.error('Unhandled error:', err);
    }

    res.status(status).json({ error: message });
}

module.exports = errorHandler;
