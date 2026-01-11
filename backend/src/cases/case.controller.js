/**
 * Case Controller
 * Handles case management HTTP requests
 */

import {
  createCase,
  getCaseById,
  getCases,
  updateCase,
  deleteCase,
} from './case.service.js';
import logger from '../utils/logger.js';

/**
 * Create a new case
 * POST /api/cases
 */
export const createCaseHandler = async (req, res) => {
  try {
    const user = req.user;
    const caseData = {
      ...req.body,
      createdBy: user.id,
      operativeId: user.operativeId,
    };

    const caseObj = await createCase(caseData);

    res.status(201).json({
      success: true,
      message: 'Case created successfully',
      data: caseObj,
    });
  } catch (error) {
    logger.error('Create case error:', error);
    res.status(500).json({
      error: 'Failed to create case',
      message: error.message,
    });
  }
};

/**
 * Get case by ID
 * GET /api/cases/:id
 */
export const getCaseHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;

    const caseObj = await getCaseById(id, user.id);

    res.status(200).json({
      success: true,
      data: caseObj,
    });
  } catch (error) {
    logger.error('Get case error:', error);
    if (error.message === 'Case not found') {
      return res.status(404).json({
        error: 'Case not found',
        message: error.message,
      });
    }
    res.status(500).json({
      error: 'Failed to fetch case',
      message: error.message,
    });
  }
};

/**
 * Get cases with filtering
 * GET /api/cases
 */
export const getCasesHandler = async (req, res) => {
  try {
    const user = req.user;
    const page = parseInt(req.query.page || '1', 10);
    const limit = parseInt(req.query.limit || '20', 10);
    const filters = {
      status: req.query.status,
      priority: req.query.priority,
      assignedTo: req.query.assignedTo,
      createdBy: req.query.createdBy,
      search: req.query.search,
    };

    const result = await getCases(filters, user.id, user.role, page, limit);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('Get cases error:', error);
    res.status(500).json({
      error: 'Failed to fetch cases',
      message: error.message,
    });
  }
};

/**
 * Update case
 * PUT /api/cases/:id
 */
export const updateCaseHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;
    const updateData = req.body;

    const caseObj = await updateCase(id, updateData, user.id, user.role);

    res.status(200).json({
      success: true,
      message: 'Case updated successfully',
      data: caseObj,
    });
  } catch (error) {
    logger.error('Update case error:', error);
    if (error.message === 'Case not found or access denied') {
      return res.status(404).json({
        error: 'Case not found',
        message: error.message,
      });
    }
    res.status(500).json({
      error: 'Failed to update case',
      message: error.message,
    });
  }
};

/**
 * Delete case
 * DELETE /api/cases/:id
 */
export const deleteCaseHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;

    await deleteCase(id, user.id, user.role);

    res.status(200).json({
      success: true,
      message: 'Case deleted successfully',
    });
  } catch (error) {
    logger.error('Delete case error:', error);
    if (error.message === 'Case not found' || error.message === 'Only admins can delete cases') {
      return res.status(error.message.includes('admin') ? 403 : 404).json({
        error: 'Failed to delete case',
        message: error.message,
      });
    }
    res.status(500).json({
      error: 'Failed to delete case',
      message: error.message,
    });
  }
};

export default {
  createCaseHandler,
  getCaseHandler,
  getCasesHandler,
  updateCaseHandler,
  deleteCaseHandler,
};
