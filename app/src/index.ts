import app from './app';
import config from './config';

app.listen(config.port, () => {
    console.info(`Okuma BC app running on port ${config.port}`);
});
