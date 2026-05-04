const winston = require('winston');
const path = require('path');

const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.printf(({ timestamp, level, message }) => {
            return `${timestamp} [${level.toUpperCase()}]: ${message}`;
        })
    ),
    transports: [
        new winston.transports.Console(),
    ],
});

// Add file transport only if not in production/Vercel
if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
    logger.add(new winston.transports.File({
        filename: path.join(process.cwd(), 'logs', 'app.log')
    }));
}

module.exports = logger;
