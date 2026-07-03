import dotenv from 'dotenv';

dotenv.config();

interface BcConfig {
    clientId: string | undefined;
    clientSecret: string | undefined;
    accessToken: string | undefined;
    storeHash: string | undefined;
    appCallbackUrl: string | undefined;
    apiBaseUrl: string;
}

interface AppConfig {
    port: number;
    sessionSecret: string | undefined;
    bc: BcConfig;
    partsBook: {
        cdnBaseUrl: string | undefined;
    };
}

const config: AppConfig = {
    port: parseInt(process.env.PORT ?? '3001', 10),
    sessionSecret: process.env.SESSION_SECRET,
    bc: {
        clientId: process.env.BC_CLIENT_ID,
        clientSecret: process.env.BC_CLIENT_SECRET,
        accessToken: process.env.BC_ACCESS_TOKEN,
        storeHash: process.env.BC_STORE_HASH,
        appCallbackUrl: process.env.BC_APP_CALLBACK_URL,
        apiBaseUrl: `https://api.bigcommerce.com/stores/${process.env.BC_STORE_HASH}`,
    },
    partsBook: {
        cdnBaseUrl: process.env.PARTS_BOOK_CDN_BASE_URL,
    },
};

const required = ['BC_ACCESS_TOKEN', 'BC_STORE_HASH', 'SESSION_SECRET', 'PARTS_BOOK_CDN_BASE_URL'];
const missing = required.filter(key => !process.env[key]);
if (missing.length) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
}

export default config;
