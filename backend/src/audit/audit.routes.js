/**
 * Audit Routes
 * Defines audit log API endpoints
 */

import express from 'express';
import {
  getAuditLogsHandler,
  getAuditLogByIdHandler,
  exportAuditLogsHandler,
} from './audit.controller.js';
import { authenticate } from '../auth/auth.middleware.js';
import { requirePermission, PERMISSIONS } from '../security/rbac.js';

const router = express.Router();

// All audit routes require authentication and admin permission
router.use(authenticate);

/**
 * @route   GET /api/admin/audit
 * @desc    Get audit logs with filtering
 * @access  Private (requires system:admin permission)
 */
router.get(
  '/',
  requirePermission(PERMISSIONS.SYSTEM_ADMIN),
  getAuditLogsHandler
);

/**
 * @route   GET /api/admin/audit/:id
 * @desc    Get audit log by ID
 * @access  Private (requires system:admin permission)
 */
router.get(
  '/:id',
  requirePermission(PERMISSIONS.SYSTEM_ADMIN),
  getAuditLogByIdHandler
);

/**
 * @route   GET /api/admin/audit/export
 * @desc    Export audit logs as CSV
 * @access  Private (requires system:admin permission)
 */
router.get(
  '/export',
  requirePermission(PERMISSIONS.SYSTEM_ADMIN),
  exportAuditLogsHandler
);

export default router;
