/**
 * Scan Routes
 * Defines scan-related API endpoints
 */

import express from 'express';
import { uploadScan, getScan, getHistory, deleteScanHandler, upload } from './scan.controller.js';
import { authenticate } from '../auth/auth.middleware.js';
import { requirePermission, PERMISSIONS } from '../security/rbac.js';

const router = express.Router();

// All scan routes require authentication
router.use(authenticate);

/**
 * @route   POST /api/scans/upload
 * @desc    Upload media file for deepfake detection
 * @access  Private (requires scan:upload permission)
 */
router.post(
  '/upload',
  requirePermission(PERMISSIONS.SCAN_UPLOAD),
  upload.single('file'),
  uploadScan
);

/**
 * @route   GET /api/scans/history
 * @desc    Get paginated scan history
 * @access  Private (requires scan:view permission)
 */
router.get(
  '/history',
  requirePermission(PERMISSIONS.SCAN_VIEW),
  getHistory
);

/**
 * @route   GET /api/scans/:id
 * @desc    Get scan details by ID
 * @access  Private (requires scan:view permission)
 */
router.get(
  '/:id',
  requirePermission(PERMISSIONS.SCAN_VIEW),
  getScan
);

/**
 * @route   DELETE /api/scans/:id
 * @desc    Delete scan
 * @access  Private (requires scan:delete permission)
 */
router.delete(
  '/:id',
  requirePermission(PERMISSIONS.SCAN_DELETE),
  deleteScanHandler
);

export default router;

