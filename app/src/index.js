'use strict';

const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const session = require('express-session');
const config = require('./config');
const routes = require('./routes');
const errorHandler = require('./middleware/errorHandler');

const app = express();

app.use(morgan('dev'));
app.use(cors());
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
app.use(errorHandler);

app.listen(config.port, () => {
    console.info(`Okuma BC app running on port ${config.port}`);
});

module.exports = app;
