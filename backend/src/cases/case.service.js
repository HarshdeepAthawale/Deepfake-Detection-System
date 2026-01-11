/**
 * Case Service
 * Handles case management operations
 */

import Case from './case.model.js';
import Scan from '../scans/scan.model.js';
import logger from '../utils/logger.js';

/**
 * Generate unique case ID
 * @returns {string} Case ID
 */
export const generateCaseId = () => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `CASE_${timestamp}_${random}`;
};

/**
 * Create a new case
 * @param {Object} caseData - Case data
 * @returns {Promise<Object>} Created case
 */
export const createCase = async (caseData) => {
  try {
    const caseId = generateCaseId();
    const caseObj = new Case({
      ...caseData,
      caseId,
    });
    await caseObj.save();

    // Update scans with case ID
    if (caseData.scanIds && caseData.scanIds.length > 0) {
      await Scan.updateMany(
        { _id: { $in: caseData.scanIds } },
        { caseId: caseObj._id }
      );
    }

    logger.info(`Case created: ${caseId}`);
    return caseObj.toObject();
  } catch (error) {
    logger.error('Create case error:', error);
    throw error;
  }
};

/**
 * Get case by ID
 * @param {string} caseId - Case ID
 * @param {string} userId - User ID (for access control)
 * @returns {Promise<Object>} Case object
 */
export const getCaseById = async (caseId, userId) => {
  try {
    const caseObj = await Case.findOne({ caseId })
      .populate('assignedTo', 'email operativeId role')
      .populate('createdBy', 'email operativeId role')
      .populate('scanIds', 'scanId fileName status result.verdict')
      .lean();

    if (!caseObj) {
      throw new Error('Case not found');
    }

    return caseObj;
  } catch (error) {
    logger.error('Get case error:', error);
    throw error;
  }
};

/**
 * Get cases with filtering and pagination
 * @param {Object} filters - Filter options
 * @param {string} userId - User ID
 * @param {string} userRole - User role
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @returns {Promise<Object>} Paginated cases
 */
export const getCases = async (filters = {}, userId, userRole, page = 1, limit = 20) => {
  try {
    const query = {};

    // Role-based filtering
    if (userRole !== 'admin') {
      // Non-admins can only see cases they created or are assigned to
      query.$or = [
        { createdBy: userId },
        { assignedTo: userId },
      ];
    }

    // Apply filters
    if (filters.status) {
      query.status = filters.status;
    }
    if (filters.priority) {
      query.priority = filters.priority;
    }
    if (filters.assignedTo) {
      query.assignedTo = filters.assignedTo;
    }
    if (filters.createdBy) {
      query.createdBy = filters.createdBy;
    }
    if (filters.search) {
      query.$or = [
        ...(query.$or || []),
        { title: { $regex: filters.search, $options: 'i' } },
        { description: { $regex: filters.search, $options: 'i' } },
        { caseId: { $regex: filters.search, $options: 'i' } },
      ];
    }

    const skip = (page - 1) * limit;

    const [cases, total] = await Promise.all([
      Case.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('assignedTo', 'email operativeId role')
        .populate('createdBy', 'email operativeId role')
        .lean(),
      Case.countDocuments(query),
    ]);

    return {
      cases,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  } catch (error) {
    logger.error('Get cases error:', error);
    throw error;
  }
};

/**
 * Update case
 * @param {string} caseId - Case ID
 * @param {Object} updateData - Update data
 * @param {string} userId - User ID
 * @param {string} userRole - User role
 * @returns {Promise<Object>} Updated case
 */
export const updateCase = async (caseId, updateData, userId, userRole) => {
  try {
    const query = { caseId };

    // Non-admins can only update cases they created or are assigned to
    if (userRole !== 'admin') {
      query.$or = [
        { createdBy: userId },
        { assignedTo: userId },
      ];
    }

    // Handle status changes
    if (updateData.status === 'resolved') {
      updateData.resolvedAt = new Date();
    }
    if (updateData.status === 'closed') {
      updateData.closedAt = new Date();
    }

    // Handle scan IDs update
    if (updateData.scanIds) {
      // Get old case to update scans
      const oldCase = await Case.findOne(query);
      if (!oldCase) {
        throw new Error('Case not found or access denied');
      }

      // Remove case ID from old scans
      if (oldCase.scanIds && oldCase.scanIds.length > 0) {
        await Scan.updateMany(
          { _id: { $in: oldCase.scanIds } },
          { $unset: { caseId: '' } }
        );
      }

      // Add case ID to new scans
      if (updateData.scanIds.length > 0) {
        await Scan.updateMany(
          { _id: { $in: updateData.scanIds } },
          { caseId: oldCase._id }
        );
      }
    }

    const caseObj = await Case.findOneAndUpdate(
      query,
      updateData,
      { new: true }
    )
      .populate('assignedTo', 'email operativeId role')
      .populate('createdBy', 'email operativeId role')
      .populate('scanIds', 'scanId fileName status result.verdict');

    if (!caseObj) {
      throw new Error('Case not found or access denied');
    }

    logger.info(`Case updated: ${caseId}`);
    return caseObj.toObject();
  } catch (error) {
    logger.error('Update case error:', error);
    throw error;
  }
};

/**
 * Delete case
 * @param {string} caseId - Case ID
 * @param {string} userId - User ID
 * @param {string} userRole - User role
 * @returns {Promise<void>}
 */
export const deleteCase = async (caseId, userId, userRole) => {
  try {
    const query = { caseId };

    // Only admins can delete cases
    if (userRole !== 'admin') {
      throw new Error('Only admins can delete cases');
    }

    const caseObj = await Case.findOne(query);
    if (!caseObj) {
      throw new Error('Case not found');
    }

    // Remove case ID from scans
    if (caseObj.scanIds && caseObj.scanIds.length > 0) {
      await Scan.updateMany(
        { _id: { $in: caseObj.scanIds } },
        { $unset: { caseId: '' } }
      );
    }

    await Case.findOneAndDelete(query);
    logger.info(`Case deleted: ${caseId}`);
  } catch (error) {
    logger.error('Delete case error:', error);
    throw error;
  }
};

export default {
  generateCaseId,
  createCase,
  getCaseById,
  getCases,
  updateCase,
  deleteCase,
};
