'use strict';

const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const session = require('express-session');
const config = require('./config');
const routes = require('./routes');
const errorHandler = require('./middleware/errorHandler');
const { NotFoundError } = require('./middleware/errors');

const app = express();

app.use(morgan('dev'));
const corsOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',').map(o => o.trim())
    : ['http://localhost:3000', 'http://localhost:3001'];

app.use(cors({
    origin: corsOrigins,
    credentials: true,
}));
app.use(express.json());

app.use(
    session({
        secret: config.sessionSecret,
        resave: false,
        saveUninitialized: false,
        cookie: { secure: process.env.NODE_ENV === 'production', httpOnly: true, sameSite: 'lax' },
    })
);

app.use(routes);
app.use((req, res, next) => next(new NotFoundError(`Cannot ${req.method} ${req.path}`)));
app.use(errorHandler);

app.listen(config.port, () => {
    console.info(`Okuma BC app running on port ${config.port}`);
});

module.exports = app;
