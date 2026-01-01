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
  createScan,
  processScan,
  getScanById,
  getScanHistory,
  deleteScan,
} from './scan.service.js';
import { generateFileHash } from '../security/encryption.js';
import config from '../config/env.js';
import logger from '../utils/logger.js';
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

    // Process scan asynchronously
    processScan(scanId, file.path).catch((error) => {
      logger.error(`Async scan processing failed for ${scanId}:`, error);
    });

    logger.info(`Scan uploaded: ${scanId} by ${user.operativeId}`);

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
 * Get scan by ID
 * GET /api/scans/:id
 */
export const getScan = async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;

    const scan = await getScanById(id, user.id);

    // Format response to match frontend expectations
    const response = {
      id: scan.scanId,
      timestamp: scan.createdAt.toISOString(),
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
 * Get scan history
 * GET /api/scans/history
 */
export const getHistory = async (req, res) => {
  try {
    const user = req.user;
    const page = parseInt(req.query.page || '1', 10);
    const limit = parseInt(req.query.limit || '20', 10);
    
    const filters = {
      status: req.query.status,
      mediaType: req.query.mediaType,
      verdict: req.query.verdict,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
    };

    const result = await getScanHistory(filters, user.id, user.role, page, limit);

    // Format scans to match frontend expectations
    const formattedScans = result.scans.map((scan) => ({
      id: scan.scanId,
      timestamp: scan.createdAt.toISOString(),
      type: scan.mediaType,
      result: scan.result?.verdict || 'PENDING',
      score: scan.result?.confidence || 0,
      hash: scan.fileHash,
      operative: scan.operativeId,
      status: scan.status,
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
 * Delete scan
 * DELETE /api/scans/:id
 */
export const deleteScanHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;

    await deleteScan(id, user.id, user.role);

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

export { upload };

export default {
  uploadScan,
  getScan,
  getHistory,
  deleteScanHandler,
};

