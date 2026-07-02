'use strict';

const app = require('./app');
const config = require('./config');

app.listen(config.port, () => {
    console.info(`Okuma BC app running on port ${config.port}`);
});
