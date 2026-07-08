import axios, { AxiosError } from 'axios';
import config from '../config';
import logger from '../config/logger';

const b2bClient = axios.create({
    baseURL: config.bc.b2bApiBaseUrl,
    headers: {
        'x-auth-token': config.bc.b2bAuthToken,
        'x-store-hash': config.bc.storeHash,
        'content-type': 'application/json',
    },
    timeout: 15000,
});

b2bClient.interceptors.response.use(
    res => res,
    (err: AxiosError<{ message?: string; errors?: unknown }>) => {
        const status = err.response?.status;
        const message = err.response?.data?.message ?? err.message;
        logger.error(`B2B API error [${status}]: ${message}`);
        return Promise.reject(err);
    }
);

export default b2bClient;
