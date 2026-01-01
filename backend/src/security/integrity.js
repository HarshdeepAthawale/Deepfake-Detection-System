/**
 * Integrity Verification Module
 * Handles file integrity checks and tamper detection
 */

import crypto from 'crypto';
import { generateFileHash } from './encryption.js';
import logger from '../utils/logger.js';

/**
 * Verify file integrity by comparing hashes
 * @param {Buffer} fileBuffer - File buffer to verify
 * @param {string} expectedHash - Expected SHA-256 hash
 * @returns {boolean} True if integrity is valid
 */
export const verifyIntegrity = (fileBuffer, expectedHash) => {
  try {
    const actualHash = generateFileHash(fileBuffer);
    const cleanExpectedHash = expectedHash.startsWith('sha256:')
      ? expectedHash
      : `sha256:${expectedHash}`;
    
    const isValid = actualHash === cleanExpectedHash;
    
    if (!isValid) {
      logger.warn(`Integrity check failed. Expected: ${cleanExpectedHash}, Got: ${actualHash}`);
    }
    
    return isValid;
  } catch (error) {
    logger.error('Integrity verification error:', error);
    return false;
  }
};

/**
 * Create integrity record for audit trail
 * @param {string} fileHash - File hash
 * @param {string} userId - User ID who uploaded
 * @param {Date} timestamp - Timestamp
 * @returns {Object} Integrity record
 */
export const createIntegrityRecord = (fileHash, userId, timestamp = new Date()) => {
  return {
    hash: fileHash,
    userId,
    timestamp,
    verified: true,
    checksum: crypto.randomBytes(16).toString('hex'), // Additional checksum
  };
};

export default {
  verifyIntegrity,
  createIntegrityRecord,
};

