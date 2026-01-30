/**
 * Scan Controller
 * Handles scan-related HTTP requests
 */

import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import {
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
} from './scan.service.js';
import { generateFileHash } from '../security/encryption.js';
import config from '../config/env.js';
import logger from '../utils/logger.js';
import { logAudit } from '../audit/audit.middleware.js';
// RBAC is handled in routes, not controller

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = config.upload.uploadPath;
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `scan-${uniqueSuffix}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  if (config.upload.allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type. Allowed types: ${config.upload.allowedMimeTypes.join(', ')}`), false);
  }
};

export const upload = multer({
  storage,
  limits: {
    fileSize: config.upload.maxFileSize,
  },
  fileFilter,
});

export const uploadMultiple = multer({
  storage,
  limits: {
    fileSize: config.upload.maxFileSize,
    files: 50, // Max 50 files per batch
  },
  fileFilter,
});

/**
 * Upload and process media file
 * POST /api/scans/upload
 */
export const uploadScan = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'No file uploaded',
      });
    }

    const user = req.user;
    const file = req.file;
    const scanId = generateScanId();

    // Generate file hash
    const fileBuffer = fs.readFileSync(file.path);
    const fileHash = generateFileHash(fileBuffer);

    // Determine media type from mime type
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
      userId: user.id,
      operativeId: user.operativeId,
      fileName: file.originalname,
      filePath: file.path,
      fileHash,
      fileSize: file.size,
      mediaType,
      mimeType: file.mimetype,
      status: 'PENDING',
    };

    const scan = await createScan(scanData);

    // Process scan asynchronously (pass userId for WebSocket targeting)
    processScan(scanId, file.path, user.id).catch((error) => {
      logger.error(`Async scan processing failed for ${scanId}:`, error);
    });

    logger.info(`Scan uploaded: ${scanId} by ${user.operativeId}`);

    // Audit log
    await logAudit(req, 'scan.upload', {
      scanId,
      fileName: file.originalname,
      fileSize: file.size,
      mediaType,
      fileHash,
    }, 'success');

    res.status(202).json({
      success: true,
      message: 'File uploaded and processing started',
      data: {
        scanId: scan.scanId,
        status: scan.status,
        fileName: scan.fileName,
        mediaType: scan.mediaType,
        hash: scan.fileHash,
      },
    });
  } catch (error) {
    logger.error('Upload scan error:', error);

    // Clean up uploaded file on error
    if (req.file?.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(500).json({
      error: 'Upload failed',
      message: error.message || 'An error occurred during file upload',
    });
  }
};

/**
 * Batch upload and process multiple media files
 * POST /api/scans/batch
 */
export const batchUploadScan = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'No files uploaded',
      });
    }

    const user = req.user;
    const files = req.files;
    const batchId = req.body.batchId || generateBatchId();

    // Limit batch size (max 50 files)
    if (files.length > 50) {
      // Clean up uploaded files
      files.forEach(file => {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      });

      return res.status(400).json({
        error: 'Validation error',
        message: 'Maximum 50 files allowed per batch',
      });
    }

    // Process batch
    const batchResult = await processBatchUpload(files, user.id, user.operativeId, batchId);

    logger.info(`Batch uploaded: ${batchResult.batchId} with ${files.length} files by ${user.operativeId}`);

    res.status(202).json({
      success: true,
      message: 'Files uploaded and batch processing started',
      data: batchResult,
    });
  } catch (error) {
    logger.error('Batch upload error:', error);

    // Clean up uploaded files on error
    if (req.files && Array.isArray(req.files)) {
      req.files.forEach(file => {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      });
    }

    res.status(500).json({
      error: 'Batch upload failed',
      message: error.message || 'An error occurred during batch upload',
    });
  }
};

/**
 * Get scan by ID
 * GET /api/scans/:id
 */
export const getScan = async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;

    const scan = await getScanById(id, user.id, user.role);

    // Format response to match frontend expectations
    const response = {
      id: scan.scanId,
      timestamp: new Date(scan.createdAt).toISOString(),
      verdict: scan.result?.verdict || 'PENDING',
      confidence: scan.result?.confidence || 0,
      riskScore: scan.result?.riskScore || 0,
      explanations: scan.result?.explanations || [],
      metadata: scan.result?.metadata || {
        facialMatch: 0,
        audioMatch: 0,
        ganFingerprint: 0,
        temporalConsistency: 0,
      },
      hash: scan.fileHash,
      status: scan.status,
      mediaType: scan.mediaType,
      fileName: scan.fileName,
      gpsCoordinates: scan.gpsCoordinates || null,
    };

    res.status(200).json({
      success: true,
      data: response,
    });
  } catch (error) {
    logger.error('Get scan error:', error);
    res.status(error.message === 'Scan not found' ? 404 : 500).json({
      error: 'Failed to retrieve scan',
      message: error.message,
    });
  }
};

/**
 * Get scan history with advanced search and filtering
 * GET /api/scans/history
 * Query parameters:
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 20)
 * - search: Full-text search query
 * - status: Filter by status (PENDING, PROCESSING, COMPLETED, FAILED)
 * - mediaType: Filter by media type (VIDEO, AUDIO, IMAGE, UNKNOWN)
 * - verdict: Filter by verdict (DEEPFAKE, SUSPICIOUS, AUTHENTIC)
 * - startDate: Start date for date range filter (ISO format)
 * - endDate: End date for date range filter (ISO format)
 * - tags: Comma-separated tags or array
 * - operativeId: Filter by operative ID (admin only)
 * - minConfidence: Minimum confidence score (0-100)
 * - maxConfidence: Maximum confidence score (0-100)
 * - minRiskScore: Minimum risk score (0-100)
 * - maxRiskScore: Maximum risk score (0-100)
 * - latitude: GPS latitude for location filtering
 * - longitude: GPS longitude for location filtering
 * - radius: GPS radius in km for location filtering
 * - sortBy: Sort field (date, confidence, riskScore, fileName)
 * - sortOrder: Sort order (asc, desc)
 */
export const getHistory = async (req, res) => {
  try {
    const user = req.user;
    const page = parseInt(req.query.page || '1', 10);
    const limit = Math.min(parseInt(req.query.limit || '20', 10), 100); // Max 100 items per page

    // Parse tags (can be comma-separated string or array)
    let tags = [];
    if (req.query.tags) {
      if (Array.isArray(req.query.tags)) {
        tags = req.query.tags;
      } else if (typeof req.query.tags === 'string') {
        tags = req.query.tags.split(',').map(tag => tag.trim()).filter(tag => tag);
      }
    }

    const filters = {
      search: req.query.search,
      status: req.query.status,
      mediaType: req.query.mediaType,
      verdict: req.query.verdict,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      tags: tags.length > 0 ? tags : undefined,
      operativeId: req.query.operativeId,
      minConfidence: req.query.minConfidence,
      maxConfidence: req.query.maxConfidence,
      minRiskScore: req.query.minRiskScore,
      maxRiskScore: req.query.maxRiskScore,
      latitude: req.query.latitude,
      longitude: req.query.longitude,
      radius: req.query.radius,
      sortBy: req.query.sortBy,
      sortOrder: req.query.sortOrder || 'desc',
    };

    // Remove undefined filters
    Object.keys(filters).forEach(key => {
      if (filters[key] === undefined) {
        delete filters[key];
      }
    });

    const result = await getScanHistory(filters, user.id, user.role, page, limit);

    // Format scans to match frontend expectations
    const formattedScans = result.scans.map((scan) => ({
      id: scan.scanId,
      timestamp: new Date(scan.createdAt).toISOString(),
      type: scan.mediaType,
      result: scan.result?.verdict || 'PENDING',
      score: scan.result?.confidence || 0,
      riskScore: scan.result?.riskScore || 0,
      hash: scan.fileHash,
      operative: scan.operativeId,
      status: scan.status,
      fileName: scan.fileName,
      tags: scan.tags || [],
      gpsCoordinates: scan.gpsCoordinates || null,
      explanations: scan.result?.explanations || [],
    }));

    res.status(200).json({
      success: true,
      data: formattedScans,
      pagination: result.pagination,
    });
  } catch (error) {
    logger.error('Get scan history error:', error);
    res.status(500).json({
      error: 'Failed to retrieve scan history',
      message: error.message,
    });
  }
};

/**
 * Update scan tags
 * PATCH /api/scans/:id/tags
 */
export const updateTags = async (req, res) => {
  try {
    const { id } = req.params;
    const { tags } = req.body;
    const user = req.user;

    if (!tags || !Array.isArray(tags)) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Tags must be an array',
      });
    }

    const scan = await updateScanTags(id, tags, user.id, user.role);

    res.status(200).json({
      success: true,
      message: 'Scan tags updated successfully',
      data: {
        scanId: scan.scanId,
        tags: scan.tags,
      },
    });
  } catch (error) {
    logger.error('Update scan tags error:', error);
    res.status(error.message === 'Scan not found or access denied' ? 404 : 500).json({
      error: 'Failed to update scan tags',
      message: error.message,
    });
  }
};

/**
 * Delete scan
 * DELETE /api/scans/:id
 */
export const deleteScanHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;

    await deleteScan(id, user.id, user.role);

    // Audit log
    await logAudit(req, 'scan.delete', {
      scanId: id,
    }, 'success');

    res.status(200).json({
      success: true,
      message: 'Scan deleted successfully',
    });
  } catch (error) {
    logger.error('Delete scan error:', error);
    res.status(error.message === 'Scan not found or access denied' ? 404 : 500).json({
      error: 'Failed to delete scan',
      message: error.message,
    });
  }
};

/**
 * Share scan with users
 * POST /api/scans/:id/share
 */
export const shareScanHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const { userIds } = req.body;
    const user = req.user;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'userIds must be a non-empty array',
      });
    }

    const scan = await shareScan(id, userIds, user.id, user.role);

    res.status(200).json({
      success: true,
      message: 'Scan shared successfully',
      data: {
        scanId: scan.scanId,
        sharedWith: scan.sharedWith,
      },
    });
  } catch (error) {
    logger.error('Share scan error:', error);
    if (error.message === 'Scan not found or access denied') {
      return res.status(404).json({
        error: 'Scan not found',
        message: error.message,
      });
    }
    res.status(500).json({
      error: 'Failed to share scan',
      message: error.message,
    });
  }
};

/**
 * Add comment to scan
 * POST /api/scans/:id/comments
 */
export const addCommentHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const { text } = req.body;
    const user = req.user;

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Comment text is required',
      });
    }

    const scan = await addComment(id, text.trim(), user.id, user.operativeId, user.role);

    res.status(200).json({
      success: true,
      message: 'Comment added successfully',
      data: {
        scanId: scan.scanId,
        comments: scan.comments,
      },
    });
  } catch (error) {
    logger.error('Add comment error:', error);
    if (error.message === 'Scan not found or access denied') {
      return res.status(404).json({
        error: 'Scan not found',
        message: error.message,
      });
    }
    res.status(500).json({
      error: 'Failed to add comment',
      message: error.message,
    });
  }
};

/**
 * Assign scan to user
 * POST /api/scans/:id/assign
 */
export const assignScanHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;
    const user = req.user;

    if (!userId) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'userId is required',
      });
    }

    const scan = await assignScan(id, userId, user.id, user.role);

    res.status(200).json({
      success: true,
      message: 'Scan assigned successfully',
      data: {
        scanId: scan.scanId,
        assignedTo: scan.assignedTo,
      },
    });
  } catch (error) {
    logger.error('Assign scan error:', error);
    if (error.message.includes('Only admins and analysts') || error.message === 'Scan not found or access denied') {
      return res.status(error.message.includes('Only') ? 403 : 404).json({
        error: 'Failed to assign scan',
        message: error.message,
      });
    }
    res.status(500).json({
      error: 'Failed to assign scan',
      message: error.message,
    });
  }
};

export default {
  uploadScan,
  batchUploadScan,
  getScan,
  getHistory,
  updateTags,
  deleteScanHandler,
  shareScanHandler,
  addCommentHandler,
  assignScanHandler,
  upload,
  uploadMultiple,
};

