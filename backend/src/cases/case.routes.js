/**
 * Case Routes
 * Defines case management API endpoints
 */

import express from 'express';
import {
  createCaseHandler,
  getCaseHandler,
  getCasesHandler,
  updateCaseHandler,
  deleteCaseHandler,
} from './case.controller.js';
import { authenticate } from '../auth/auth.middleware.js';
import { requirePermission, PERMISSIONS } from '../security/rbac.js';

const router = express.Router();

// All case routes require authentication
router.use(authenticate);

/**
 * @route   POST /api/cases
 * @desc    Create a new case
 * @access  Private
 */
router.post('/', createCaseHandler);

/**
 * @route   GET /api/cases
 * @desc    Get cases with filtering
 * @access  Private
 */
router.get('/', getCasesHandler);

/**
 * @route   GET /api/cases/:id
 * @desc    Get case by ID
 * @access  Private
 */
router.get('/:id', getCaseHandler);

/**
 * @route   PUT /api/cases/:id
 * @desc    Update case
 * @access  Private
 */
router.put('/:id', updateCaseHandler);

/**
 * @route   DELETE /api/cases/:id
 * @desc    Delete case (admin only)
 * @access  Private (requires system:admin permission)
 */
router.delete('/:id', requirePermission(PERMISSIONS.SYSTEM_ADMIN), deleteCaseHandler);

export default router;
