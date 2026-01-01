/**
 * Winston Logger Configuration
 * Centralized logging with file and console output
 */

import winston from 'winston';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import config from '../config/env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Ensure logs directory exists
const logsDir = join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    if (Object.keys(meta).length > 0) {
      msg += ` ${JSON.stringify(meta)}`;
    }
    return msg;
  })
);

const logger = winston.createLogger({
  level: config.logging.level,
  format: logFormat,
  defaultMeta: { service: 'deepfake-detection-backend' },
  transports: [
    // Write all logs to console
    new winston.transports.Console({
      format: consoleFormat,
    }),
    // Write all logs with level 'error' and below to error.log
    new winston.transports.File({
      filename: join(logsDir, 'error.log'),
      level: 'error',
    }),
    // Write all logs to combined.log
    new winston.transports.File({
      filename: join(logsDir, 'app.log'),
    }),
  ],
});

// If we're not in production, log to the console with simpler format
if (config.server.nodeEnv !== 'production') {
  logger.add(
    new winston.transports.Console({
      format: winston.format.simple(),
    })
  );
}

export default logger;

