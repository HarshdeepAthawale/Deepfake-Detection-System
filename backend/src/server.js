/**
 * Server Entry Point
 * Starts the Express server and connects to database
 */

import app from './app.js';
import { connectDB } from './config/db.js';
import config from './config/env.js';
import logger from './utils/logger.js';

const PORT = config.server.port;

/**
 * Start the server
 */
const startServer = async () => {
  try {
    // Connect to MongoDB
    logger.info('Connecting to database...');
    await connectDB();

    // Start Express server
    app.listen(PORT, () => {
      logger.info(`🚀 Server running on port ${PORT}`);
      logger.info(`📡 Environment: ${config.server.nodeEnv}`);
      logger.info(`🔐 Health check: http://localhost:${PORT}/health`);
      logger.info(`📚 API base: http://localhost:${PORT}/api`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  logger.error('Unhandled Promise Rejection:', err);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', err);
  process.exit(1);
});

// Start the server
startServer();

