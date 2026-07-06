import { createLogger, format, transports } from 'winston';

const env = process.env.NODE_ENV || 'development';

const devFormat = format.combine(
    format.colorize(),
    format.timestamp({ format: 'HH:mm:ss' }),
    format.errors({ stack: true }),
    format.printf(({ level, message, timestamp, stack }) =>
        stack ? `[${timestamp}] ${level}: ${message}\n${stack}` : `[${timestamp}] ${level}: ${message}`
    )
);

const prodFormat = format.combine(format.timestamp(), format.errors({ stack: true }), format.json());

const LEVELS: Record<string, string> = {
    development: 'debug',
    test: 'warn',
};

const logger = createLogger({
    level: LEVELS[env] || 'http',
    format: env === 'development' ? devFormat : prodFormat,
    transports: [new transports.Console()],
});

export default logger;
