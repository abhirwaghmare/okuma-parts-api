// Set required env vars before any module is loaded.
// dotenv.config() in config/index.ts does not override existing process.env values,
// so these take precedence over any .env file on disk.
process.env.NODE_ENV = 'test';
process.env.BC_ACCESS_TOKEN = 'test-bc-token';
process.env.BC_STORE_HASH = 'test-store-hash';
process.env.SESSION_SECRET = 'test-session-secret';
process.env.PARTS_BOOK_CDN_BASE_URL = 'https://cdn.test/parts-book';
process.env.RATE_LIMIT_MAX = '10000';
