/**
 * Scan Service
 * Business logic for scan operations
 */

import Scan from './scan.model.js';
import { processMedia } from '../agents/perception.agent.js';
import { detectDeepfake } from '../agents/detection.agent.js';
import { analyzeCompression } from '../agents/compression.agent.js';
import { generateExplanations } from '../agents/cognitive.agent.js';
import logger from '../utils/logger.js';

/**
 * Generate unique scan ID
 * @returns {string} Scan ID
 */
export const generateScanId = () => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `SCAN_${timestamp}_${random}`;
};

/**
 * Create a new scan record
 * @param {Object} scanData - Scan data
 * @returns {Promise<Object>} Created scan
 */
export const createScan = async (scanData) => {
  try {
    const scan = new Scan(scanData);
    await scan.save();
    logger.info(`Scan created: ${scan.scanId}`);
    return scan.toObject();
  } catch (error) {
    logger.error('Create scan error:', error);
    throw error;
  }
};

/**
 * Process scan through agentic pipeline
 * @param {string} scanId - Scan ID
 * @param {string} filePath - Path to uploaded file
 * @returns {Promise<Object>} Final scan result
 */
export const processScan = async (scanId, filePath) => {
  try {
    logger.info(`[SCAN_SERVICE] Starting agentic pipeline for scan: ${scanId}`);

    // Update status to PROCESSING
    await Scan.findOneAndUpdate(
      { scanId },
      { status: 'PROCESSING' },
      { new: true }
    );

    // Step 1: Perception Agent
    logger.info(`[SCAN_SERVICE] Step 1/4: Perception Agent`);
    const perceptionData = await processMedia(filePath, scanId);

    // Step 2: Detection Agent
    logger.info(`[SCAN_SERVICE] Step 2/4: Detection Agent`);
    const detectionScores = await detectDeepfake(perceptionData);

    // Step 3: Compression Agent
    logger.info(`[SCAN_SERVICE] Step 3/4: Compression Agent`);
    const compressionAdjusted = await analyzeCompression(perceptionData, detectionScores);

    // Step 4: Cognitive Agent
    logger.info(`[SCAN_SERVICE] Step 4/4: Cognitive Agent`);
    const finalResult = await generateExplanations(compressionAdjusted, perceptionData);

    // Update scan with results
    const updateData = {
      status: 'COMPLETED',
      result: finalResult,
      processingData: {
        perception: perceptionData,
        detection: detectionScores,
        compression: compressionAdjusted,
        cognitive: finalResult,
      },
    };

    // Add GPS coordinates if available
    if (perceptionData.gpsCoordinates) {
      updateData.gpsCoordinates = perceptionData.gpsCoordinates;
    }

    const updatedScan = await Scan.findOneAndUpdate(
      { scanId },
      updateData,
      { new: true }
    );

    logger.info(`[SCAN_SERVICE] Pipeline complete for scan: ${scanId}. Verdict: ${finalResult.verdict}`);

    return updatedScan.toObject();
  } catch (error) {
    logger.error(`[SCAN_SERVICE] Processing error for scan ${scanId}:`, error);

    // Update scan with error
    await Scan.findOneAndUpdate(
      { scanId },
      {
        status: 'FAILED',
        error: {
          message: error.message,
          stack: error.stack,
        },
      }
    );

    throw error;
  }
};

/**
 * Get scan by ID
 * @param {string} scanId - Scan ID
 * @param {string} userId - User ID (for access control)
 * @returns {Promise<Object>} Scan object
 */
export const getScanById = async (scanId, userId) => {
  try {
    const scan = await Scan.findOne({ scanId, userId });
    if (!scan) {
      throw new Error('Scan not found');
    }
    return scan.toObject();
  } catch (error) {
    logger.error('Get scan error:', error);
    throw error;
  }
};

/**
 * Get scan history with pagination
 * @param {Object} filters - Filter options
 * @param {string} userId - User ID
 * @param {string} userRole - User role
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @returns {Promise<Object>} Paginated scan results
 */
export const getScanHistory = async (filters = {}, userId, userRole, page = 1, limit = 20) => {
  try {
    const query = {};

    // Role-based filtering
    if (userRole !== 'admin') {
      query.userId = userId; // Non-admins only see their own scans
    }

    // Apply additional filters
    if (filters.status) {
      query.status = filters.status;
    }
    if (filters.mediaType) {
      query.mediaType = filters.mediaType;
    }
    if (filters.verdict) {
      query['result.verdict'] = filters.verdict;
    }
    if (filters.startDate || filters.endDate) {
      query.createdAt = {};
      if (filters.startDate) {
        query.createdAt.$gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        query.createdAt.$lte = new Date(filters.endDate);
      }
    }

    const skip = (page - 1) * limit;

    const [scans, total] = await Promise.all([
      Scan.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Scan.countDocuments(query),
    ]);

    return {
      scans,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  } catch (error) {
    logger.error('Get scan history error:', error);
    throw error;
  }
};

/**
 * Delete scan
 * @param {string} scanId - Scan ID
 * @param {string} userId - User ID
 * @param {string} userRole - User role
 * @returns {Promise<void>}
 */
export const deleteScan = async (scanId, userId, userRole) => {
  try {
    const query = { scanId };
    
    // Non-admins can only delete their own scans
    if (userRole !== 'admin') {
      query.userId = userId;
    }

    const scan = await Scan.findOneAndDelete(query);
    if (!scan) {
      throw new Error('Scan not found or access denied');
    }

    logger.info(`Scan deleted: ${scanId}`);
  } catch (error) {
    logger.error('Delete scan error:', error);
    throw error;
  }
};

export default {
  generateScanId,
  createScan,
  processScan,
  getScanById,
  getScanHistory,
  deleteScan,
};

