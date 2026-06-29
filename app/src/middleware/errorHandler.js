'use strict';

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
    const status = err.status || err.response?.status || 500;
    const message = status < 500 ? err.message : 'Internal server error';

    if (status >= 500) {
        console.error('Unhandled error:', err);
    }

    res.status(status).json({ error: message });
}

module.exports = errorHandler;
