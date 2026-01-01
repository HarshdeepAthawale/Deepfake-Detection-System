/**
 * MongoDB Database Connection Module
 * Handles connection, reconnection, and error handling
 */

import mongoose from 'mongoose';
import config from './env.js';
import logger from '../utils/logger.js';

let isConnected = false;

/**
 * Connect to MongoDB database
 */
export const connectDB = async () => {
  if (isConnected) {
    logger.info('Database already connected');
    return;
  }

  try {
    // Modern Mongoose doesn't need these options (removed deprecated options)
    await mongoose.connect(config.database.uri);
    isConnected = true;
    logger.info(`✅ MongoDB connected: ${config.database.name}`);

    mongoose.connection.on('error', (err) => {
      logger.error('MongoDB connection error:', err);
      isConnected = false;
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected');
      isConnected = false;
    });

    mongoose.connection.on('reconnected', () => {
      logger.info('MongoDB reconnected');
      isConnected = true;
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      logger.info('MongoDB connection closed due to app termination');
      process.exit(0);
    });
  } catch (error) {
    logger.error('Failed to connect to MongoDB:', error);
    isConnected = false;
    throw error;
  }
};

/**
 * Disconnect from MongoDB
 */
export const disconnectDB = async () => {
  if (!isConnected) return;
  await mongoose.connection.close();
  isConnected = false;
  logger.info('MongoDB disconnected');
};

export default { connectDB, disconnectDB };

