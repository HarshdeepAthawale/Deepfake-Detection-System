/**
 * Encryption Module
 * Handles file encryption/decryption for secure storage
 */

import crypto from 'crypto';
import config from '../config/env.js';
import logger from '../utils/logger.js';

const algorithm = 'aes-256-cbc';
const key = crypto.scryptSync(config.security.encryptionKey, 'salt', 32);
const iv = Buffer.from(config.security.encryptionIV.padEnd(16, '0').slice(0, 16));

/**
 * Encrypt data buffer
 * @param {Buffer} data - Data to encrypt
 * @returns {Buffer} Encrypted data
 */
export const encrypt = (data) => {
  try {
    const cipher = crypto.createCipheriv(algorithm, key, iv);
    const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
    return encrypted;
  } catch (error) {
    logger.error('Encryption error:', error);
    throw new Error('Encryption failed');
  }
};

/**
 * Decrypt data buffer
 * @param {Buffer} encryptedData - Encrypted data
 * @returns {Buffer} Decrypted data
 */
export const decrypt = (encryptedData) => {
  try {
    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    const decrypted = Buffer.concat([decipher.update(encryptedData), decipher.final()]);
    return decrypted;
  } catch (error) {
    logger.error('Decryption error:', error);
    throw new Error('Decryption failed');
  }
};

/**
 * Generate SHA-256 hash
 * @param {Buffer|string} data - Data to hash
 * @returns {string} SHA-256 hash
 */
export const generateHash = (data) => {
  return crypto.createHash('sha256').update(data).digest('hex');
};

/**
 * Generate file integrity hash
 * @param {Buffer} fileBuffer - File buffer
 * @returns {string} SHA-256 hash prefixed with 'sha256:'
 */
export const generateFileHash = (fileBuffer) => {
  const hash = generateHash(fileBuffer);
  return `sha256:${hash}`;
};

export default {
  encrypt,
  decrypt,
  generateHash,
  generateFileHash,
};

