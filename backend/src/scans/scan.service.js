/**
 * Scan Service
 * Business logic for scan operations
 */

import fs from 'fs';
import Scan from './scan.model.js';
import { processMedia } from '../agents/perception.agent.js';
import { detectDeepfake } from '../agents/detection.agent.js';
import { analyzeCompression } from '../agents/compression.agent.js';
import { generateExplanations } from '../agents/cognitive.agent.js';
import { generateFileHash } from '../security/encryption.js';
import logger from '../utils/logger.js';
import { emitScanProgress, emitScanComplete, emitScanFailed, emitScanUpdateToUser } from './scan.socket.js';
import { createScanQueue, addScanJob } from '../utils/queue.js';
import { cached, makeKey, invalidate, delPattern } from '../utils/cache.js';
import { createNotification } from '../notifications/notification.service.js';

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
 * @param {string} userId - User ID (for WebSocket targeting)
 * @returns {Promise<Object>} Final scan result
 */
export const processScan = async (scanId, filePath, userId = null) => {
  try {
    logger.info(`[SCAN_SERVICE] Starting agentic pipeline for scan: ${scanId}`);

    // Get scan to retrieve userId if not provided
    const scan = await Scan.findOne({ scanId });
    if (!scan) {
      throw new Error('Scan not found');
    }
    const targetUserId = userId || scan.userId.toString();

    // Update status to PROCESSING
    await Scan.findOneAndUpdate(
      { scanId },
      { status: 'PROCESSING' },
      { new: true }
    );

    // Emit initial processing status
    emitScanProgress(scanId, 10, 'Initializing');
    if (targetUserId) {
      emitScanUpdateToUser(targetUserId, scanId, { type: 'status', status: 'PROCESSING', progress: 10, stage: 'Initializing' });
    }

    // Step 1: Perception Agent
    logger.info(`[SCAN_SERVICE] Step 1/4: Perception Agent`);
    emitScanProgress(scanId, 25, 'Perception Agent - Extracting metadata');
    if (targetUserId) {
      emitScanUpdateToUser(targetUserId, scanId, { type: 'status', status: 'PROCESSING', progress: 25, stage: 'Perception Agent' });
    }
    const perceptionData = await processMedia(filePath, scanId);

    // Step 2: Detection Agent
    logger.info(`[SCAN_SERVICE] Step 2/4: Detection Agent`);
    emitScanProgress(scanId, 50, 'Detection Agent - Analyzing content');
    if (targetUserId) {
      emitScanUpdateToUser(targetUserId, scanId, { type: 'status', status: 'PROCESSING', progress: 50, stage: 'Detection Agent' });
    }
    const detectionScores = await detectDeepfake(perceptionData);

    // Step 3: Compression Agent
    logger.info(`[SCAN_SERVICE] Step 3/4: Compression Agent`);
    emitScanProgress(scanId, 75, 'Compression Agent - Analyzing artifacts');
    if (targetUserId) {
      emitScanUpdateToUser(targetUserId, scanId, { type: 'status', status: 'PROCESSING', progress: 75, stage: 'Compression Agent' });
    }
    const compressionAdjusted = await analyzeCompression(perceptionData, detectionScores);

    // Step 4: Cognitive Agent
    logger.info(`[SCAN_SERVICE] Step 4/4: Cognitive Agent`);
    emitScanProgress(scanId, 90, 'Cognitive Agent - Generating report');
    if (targetUserId) {
      emitScanUpdateToUser(targetUserId, scanId, { type: 'status', status: 'PROCESSING', progress: 90, stage: 'Cognitive Agent' });
    }
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

    // Invalidate cache for this scan and related history
    const targetUserId = userId || updatedScan.userId.toString();
    await invalidate([makeKey('scan', `${scanId}:${targetUserId}`)]);
    await delPattern('scan:history:*'); // Invalidate all history caches

    // Create notification
    try {
      const notificationType = finalResult.verdict === 'DEEPFAKE' ? 'deepfake_detected' : 'scan_complete';
      const priority = finalResult.verdict === 'DEEPFAKE' ? 'critical' : 'medium';
      
      await createNotification({
        userId: updatedScan.userId,
        type: notificationType,
        title: finalResult.verdict === 'DEEPFAKE' 
          ? 'Deepfake Detected!' 
          : `Scan Complete: ${finalResult.verdict}`,
        message: `Scan ${scanId} has completed with verdict: ${finalResult.verdict}`,
        data: {
          scanId,
          verdict: finalResult.verdict,
          confidence: finalResult.confidence,
          riskScore: finalResult.riskScore,
          fileName: updatedScan.fileName,
        },
        priority,
      }, true); // Send email notification
    } catch (notifError) {
      logger.warn('Failed to create notification:', notifError);
      // Don't fail scan processing if notification fails
    }

    // Emit completion event
    emitScanComplete(scanId, finalResult);
    if (targetUserId) {
      emitScanUpdateToUser(targetUserId, scanId, { 
        type: 'complete', 
        status: 'COMPLETED', 
        progress: 100, 
        stage: 'Complete',
        result: finalResult 
      });
    }

    return updatedScan.toObject();
  } catch (error) {
    logger.error(`[SCAN_SERVICE] Processing error for scan ${scanId}:`, error);

    // Create failure notification
    try {
      const scan = await Scan.findOne({ scanId });
      if (scan && scan.userId) {
        await createNotification({
          userId: scan.userId,
          type: 'scan_failed',
          title: 'Scan Processing Failed',
          message: `Scan ${scanId} failed to process: ${error.message}`,
          data: {
            scanId,
            error: error.message,
            fileName: scan.fileName,
          },
          priority: 'high',
        }, false); // Don't send email for failures unless user has emailOnAll enabled
      }
    } catch (notifError) {
      logger.warn('Failed to create failure notification:', notifError);
    }

    // Update scan with error
    const scan = await Scan.findOneAndUpdate(
      { scanId },
      {
        status: 'FAILED',
        error: {
          message: error.message,
          stack: error.stack,
        },
      },
      { new: true }
    );

    const targetUserId = userId || (scan && scan.userId ? scan.userId.toString() : null);

    // Emit failure event
    emitScanFailed(scanId, error);
    if (targetUserId) {
      emitScanUpdateToUser(targetUserId, scanId, { 
        type: 'failed', 
        status: 'FAILED', 
        progress: 0, 
        stage: 'Failed',
        error: { message: error.message } 
      });
    }

    throw error;
  }
};

/**
 * Get scan by ID
 * @param {string} scanId - Scan ID
 * @param {string} userId - User ID (for access control)
 * @param {string} userRole - User role (optional, for access control)
 * @returns {Promise<Object>} Scan object
 */
export const getScanById = async (scanId, userId, userRole = null) => {
  try {
    const cacheKey = makeKey('scan', `${scanId}:${userId}`);
    
    return await cached(cacheKey, async () => {
      const query = { scanId };
      
      // Access control: users can see their own scans, shared scans, or all scans if admin/analyst
      if (userRole === 'admin' || userRole === 'analyst') {
        // Admins and analysts can see all scans
      } else {
        // Regular users can only see their own scans or shared scans
        query.$or = [
          { userId },
          { sharedWith: userId },
        ];
      }
      
      const scan = await Scan.findOne(query);
      if (!scan) {
        throw new Error('Scan not found');
      }
      return scan.toObject();
    }, 300); // Cache for 5 minutes
  } catch (error) {
    logger.error('Get scan error:', error);
    throw error;
  }
};

/**
 * Get scan history with pagination and advanced search/filtering
 * @param {Object} filters - Filter options
 * @param {string} userId - User ID
 * @param {string} userRole - User role
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @returns {Promise<Object>} Paginated scan results
 */
export const getScanHistory = async (filters = {}, userId, userRole, page = 1, limit = 20) => {
  try {
    // Create cache key from filters
    const filterKey = JSON.stringify({ filters, userId, userRole, page, limit });
    const cacheKey = makeKey('scan:history', Buffer.from(filterKey).toString('base64'));
    
    return await cached(cacheKey, async () => {
      const query = {};

    // Role-based filtering
    if (userRole === 'admin' || userRole === 'analyst') {
      // Admins and analysts can see all scans
    } else {
      // Regular users can only see their own scans or shared scans
      query.$or = [
        { userId },
        { sharedWith: userId },
      ];
    }

    // Full-text search across fileName, explanations, operativeId
    if (filters.search) {
      query.$text = { $search: filters.search };
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
    
    // Date range filtering
    if (filters.startDate || filters.endDate) {
      query.createdAt = {};
      if (filters.startDate) {
        query.createdAt.$gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        query.createdAt.$lte = new Date(filters.endDate);
      }
    }

    // GPS location filtering (within radius)
    if (filters.latitude && filters.longitude && filters.radius) {
      // MongoDB geospatial query for location-based filtering
      // Note: This is a simplified implementation - in production, use proper geospatial indexing
      query.gpsCoordinates = {
        $exists: true,
        $ne: null,
      };
      // For exact implementation, you'd use $geoWithin with $centerSphere
      // This requires a 2dsphere index on gpsCoordinates
    }

    // Tag filtering
    if (filters.tags && Array.isArray(filters.tags) && filters.tags.length > 0) {
      query.tags = { $in: filters.tags };
    }

    // User/operative filtering (for admins)
    if (userRole === 'admin' && filters.operativeId) {
      query.operativeId = filters.operativeId;
    }

    // Confidence score filtering
    if (filters.minConfidence !== undefined || filters.maxConfidence !== undefined) {
      query['result.confidence'] = {};
      if (filters.minConfidence !== undefined) {
        query['result.confidence'].$gte = parseFloat(filters.minConfidence);
      }
      if (filters.maxConfidence !== undefined) {
        query['result.confidence'].$lte = parseFloat(filters.maxConfidence);
      }
    }

    // Risk score filtering
    if (filters.minRiskScore !== undefined || filters.maxRiskScore !== undefined) {
      query['result.riskScore'] = {};
      if (filters.minRiskScore !== undefined) {
        query['result.riskScore'].$gte = parseFloat(filters.minRiskScore);
      }
      if (filters.maxRiskScore !== undefined) {
        query['result.riskScore'].$lte = parseFloat(filters.maxRiskScore);
      }
    }

    const skip = (page - 1) * limit;

    // Build sort options
    let sortOptions = { createdAt: -1 }; // Default sort by newest first
    if (filters.sortBy) {
      const sortDirection = filters.sortOrder === 'asc' ? 1 : -1;
      switch (filters.sortBy) {
        case 'date':
          sortOptions = { createdAt: sortDirection };
          break;
        case 'confidence':
          sortOptions = { 'result.confidence': sortDirection };
          break;
        case 'riskScore':
          sortOptions = { 'result.riskScore': sortDirection };
          break;
        case 'fileName':
          sortOptions = { fileName: sortDirection };
          break;
        default:
          sortOptions = { createdAt: -1 };
      }
    }

    // If text search is used, add text score to sort (higher relevance first)
    if (filters.search) {
      sortOptions = { score: { $meta: 'textScore' }, ...sortOptions };
    }

    const [scans, total] = await Promise.all([
      Scan.find(query, filters.search ? { score: { $meta: 'textScore' } } : {})
        .sort(sortOptions)
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
    }, 180); // Cache for 3 minutes
  } catch (error) {
    logger.error('Get scan history error:', error);
    throw error;
  }
};

/**
 * Update scan tags
 * @param {string} scanId - Scan ID
 * @param {string[]} tags - Array of tags
 * @param {string} userId - User ID
 * @param {string} userRole - User role
 * @returns {Promise<Object>} Updated scan
 */
export const updateScanTags = async (scanId, tags, userId, userRole) => {
  try {
    const query = { scanId };
    
    // Non-admins can only update their own scans
    if (userRole !== 'admin') {
      query.userId = userId;
    }

    // Validate tags (must be array of strings)
    if (!Array.isArray(tags)) {
      throw new Error('Tags must be an array');
    }

    // Clean and validate tags (remove duplicates, trim, filter empty)
    const cleanTags = [...new Set(tags.map(tag => String(tag).trim()).filter(tag => tag.length > 0))];

    const scan = await Scan.findOneAndUpdate(
      query,
      { tags: cleanTags },
      { new: true }
    );

    if (!scan) {
      throw new Error('Scan not found or access denied');
    }

    logger.info(`Scan tags updated: ${scanId}, tags: ${cleanTags.join(', ')}`);
    
    // Invalidate cache
    await invalidate([makeKey('scan', `${scanId}:${userId}`)]);
    await delPattern('scan:history:*');
    
    return scan.toObject();
  } catch (error) {
    logger.error('Update scan tags error:', error);
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

    // Invalidate cache
    await invalidate([makeKey('scan', `${scanId}:${userId}`)]);
    await delPattern('scan:history:*');

    logger.info(`Scan deleted: ${scanId}`);
  } catch (error) {
    logger.error('Delete scan error:', error);
    throw error;
  }
};

/**
 * Generate unique batch ID
 * @returns {string} Batch ID
 */
export const generateBatchId = () => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `BATCH_${timestamp}_${random}`;
};

/**
 * Process batch upload - create scans and queue jobs
 * @param {Array<Object>} files - Array of file objects { file, originalname, path, size, mimetype }
 * @param {string} userId - User ID
 * @param {string} operativeId - Operative ID
 * @param {string} batchId - Optional batch ID
 * @returns {Promise<Object>} Batch processing result
 */
export const processBatchUpload = async (files, userId, operativeId, batchId = null) => {
  try {
    const batchIdGenerated = batchId || generateBatchId();
    const scans = [];
    const scanQueue = createScanQueue();

    // Process each file
    for (const file of files) {
      try {
        const scanId = generateScanId();
        
        // Generate file hash
        const fileBuffer = fs.readFileSync(file.path);
        const fileHash = generateFileHash(fileBuffer);

        // Determine media type
        let mediaType = 'UNKNOWN';
        if (file.mimetype.startsWith('video/')) {
          mediaType = 'VIDEO';
        } else if (file.mimetype.startsWith('audio/')) {
          mediaType = 'AUDIO';
        } else if (file.mimetype.startsWith('image/')) {
          mediaType = 'IMAGE';
        }

        // Create scan record
        const scanData = {
          scanId,
          userId,
          operativeId,
          fileName: file.originalname,
          filePath: file.path,
          fileHash,
          fileSize: file.size,
          mediaType,
          mimeType: file.mimetype,
          status: 'PENDING',
          batchId: batchIdGenerated, // Add batch ID to track
        };

        const scan = await createScan(scanData);
        scans.push({
          scanId: scan.scanId,
          fileName: scan.fileName,
          mediaType: scan.mediaType,
          status: scan.status,
        });

        // Add to queue if queue is available, otherwise process directly
        if (scanQueue) {
          await addScanJob(scanQueue, {
            scanId,
            filePath: file.path,
            userId,
            batchId: batchIdGenerated,
          });
          logger.info(`[BATCH] Job queued for scan: ${scanId}`);
        } else {
          // Fallback: process directly if queue not available
          logger.warn(`[BATCH] Queue not available, processing directly: ${scanId}`);
          processScan(scanId, file.path, userId).catch((error) => {
            logger.error(`[BATCH] Direct processing failed for ${scanId}:`, error);
          });
        }
      } catch (error) {
        logger.error(`[BATCH] Failed to process file ${file.originalname}:`, error);
        scans.push({
          fileName: file.originalname,
          error: error.message,
        });
      }
    }

    return {
      batchId: batchIdGenerated,
      totalFiles: files.length,
      scansCreated: scans.filter(s => s.scanId).length,
      scans,
    };
  } catch (error) {
    logger.error('[BATCH] Batch processing error:', error);
    throw error;
  }
};

/**
 * Share scan with users
 * @param {string} scanId - Scan ID
 * @param {string[]} userIds - Array of user IDs to share with
 * @param {string} userId - Current user ID
 * @param {string} userRole - Current user role
 * @returns {Promise<Object>} Updated scan
 */
export const shareScan = async (scanId, userIds, userId, userRole) => {
  try {
    const query = { scanId };
    
    // Non-admins can only share their own scans
    if (userRole !== 'admin') {
      query.userId = userId;
    }

    const scan = await Scan.findOneAndUpdate(
      query,
      { $addToSet: { sharedWith: { $each: userIds } } },
      { new: true }
    );

    if (!scan) {
      throw new Error('Scan not found or access denied');
    }

    logger.info(`Scan shared: ${scanId} with ${userIds.length} users`);
    return scan.toObject();
  } catch (error) {
    logger.error('Share scan error:', error);
    throw error;
  }
};

/**
 * Add comment to scan
 * @param {string} scanId - Scan ID
 * @param {string} text - Comment text
 * @param {string} userId - User ID
 * @param {string} operativeId - Operative ID
 * @param {string} userRole - User role
 * @returns {Promise<Object>} Updated scan
 */
export const addComment = async (scanId, text, userId, operativeId, userRole) => {
  try {
    const query = { scanId };
    
    // Check if user has access to scan
    if (userRole !== 'admin') {
      query.$or = [
        { userId },
        { sharedWith: userId },
      ];
    }

    const scan = await Scan.findOne(query);
    if (!scan) {
      throw new Error('Scan not found or access denied');
    }

    scan.comments.push({
      userId,
      operativeId,
      text,
      createdAt: new Date(),
    });

    await scan.save();

    logger.info(`Comment added to scan: ${scanId} by ${operativeId}`);
    return scan.toObject();
  } catch (error) {
    logger.error('Add comment error:', error);
    throw error;
  }
};

/**
 * Assign scan to user
 * @param {string} scanId - Scan ID
 * @param {string} assignToUserId - User ID to assign to
 * @param {string} userId - Current user ID
 * @param {string} userRole - Current user role
 * @returns {Promise<Object>} Updated scan
 */
export const assignScan = async (scanId, assignToUserId, userId, userRole) => {
  try {
    // Only admins and analysts can assign scans
    if (userRole !== 'admin' && userRole !== 'analyst') {
      throw new Error('Only admins and analysts can assign scans');
    }

    const query = { scanId };
    
    // Non-admins can only assign scans they have access to
    if (userRole !== 'admin') {
      query.$or = [
        { userId },
        { sharedWith: userId },
      ];
    }

    const scan = await Scan.findOneAndUpdate(
      query,
      { assignedTo: assignToUserId },
      { new: true }
    );

    if (!scan) {
      throw new Error('Scan not found or access denied');
    }

    logger.info(`Scan assigned: ${scanId} to user ${assignToUserId}`);
    return scan.toObject();
  } catch (error) {
    logger.error('Assign scan error:', error);
    throw error;
  }
};

export default {
  generateScanId,
  generateBatchId,
  createScan,
  processScan,
  processBatchUpload,
  getScanById,
  getScanHistory,
  updateScanTags,
  deleteScan,
  shareScan,
  addComment,
  assignScan,
};

