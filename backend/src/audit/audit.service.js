/**
 * Audit Service
 * Handles audit logging operations
 */

import AuditLog from './audit.model.js';
import logger from '../utils/logger.js';

/**
 * Create audit log entry
 * @param {Object} auditData - Audit log data
 * @returns {Promise<Object>} Created audit log
 */
export const createAuditLog = async (auditData) => {
  try {
    const auditLog = new AuditLog(auditData);
    await auditLog.save();
    return auditLog.toObject();
  } catch (error) {
    logger.error('Create audit log error:', error);
    // Don't throw - audit logging should not break the application
    return null;
  }
};

/**
 * Get audit logs with filtering and pagination
 * @param {Object} filters - Filter options
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @returns {Promise<Object>} Paginated audit logs
 */
export const getAuditLogs = async (filters = {}, page = 1, limit = 50) => {
  try {
    const query = {};

    // Filter by user
    if (filters.userId) {
      query.userId = filters.userId;
    }
    if (filters.operativeId) {
      query.operativeId = filters.operativeId;
    }

    // Filter by action
    if (filters.action) {
      query.action = filters.action;
    }

    // Filter by resource type
    if (filters.resourceType) {
      query.resourceType = filters.resourceType;
    }

    // Filter by resource ID
    if (filters.resourceId) {
      query.resourceId = filters.resourceId;
    }

    // Filter by status
    if (filters.status) {
      query.status = filters.status;
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

    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      AuditLog.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .populate('userId', 'email operativeId role'),
      AuditLog.countDocuments(query),
    ]);

    return {
      logs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  } catch (error) {
    logger.error('Get audit logs error:', error);
    throw error;
  }
};

/**
 * Get audit log by ID
 * @param {string} logId - Audit log ID
 * @returns {Promise<Object>} Audit log
 */
export const getAuditLogById = async (logId) => {
  try {
    const log = await AuditLog.findById(logId)
      .lean()
      .populate('userId', 'email operativeId role');

    if (!log) {
      throw new Error('Audit log not found');
    }

    return log;
  } catch (error) {
    logger.error('Get audit log by ID error:', error);
    throw error;
  }
};

/**
 * Export audit logs as CSV
 * @param {Object} filters - Filter options
 * @returns {Promise<string>} CSV string
 */
export const exportAuditLogs = async (filters = {}) => {
  try {
    const query = {};

    // Apply same filters as getAuditLogs
    if (filters.userId) query.userId = filters.userId;
    if (filters.operativeId) query.operativeId = filters.operativeId;
    if (filters.action) query.action = filters.action;
    if (filters.resourceType) query.resourceType = filters.resourceType;
    if (filters.resourceId) query.resourceId = filters.resourceId;
    if (filters.status) query.status = filters.status;

    if (filters.startDate || filters.endDate) {
      query.createdAt = {};
      if (filters.startDate) query.createdAt.$gte = new Date(filters.startDate);
      if (filters.endDate) query.createdAt.$lte = new Date(filters.endDate);
    }

    const logs = await AuditLog.find(query)
      .sort({ createdAt: -1 })
      .limit(10000) // Limit exports to prevent memory issues
      .lean()
      .populate('userId', 'email operativeId role');

    // Generate CSV
    const headers = [
      'Timestamp',
      'Action',
      'User Email',
      'Operative ID',
      'Role',
      'Resource Type',
      'Resource ID',
      'Status',
      'IP Address',
      'Details',
    ];

    const rows = logs.map((log) => {
      const user = log.userId || {};
      return [
        new Date(log.createdAt).toISOString(),
        log.action,
        user.email || '',
        log.operativeId || '',
        log.userRole || '',
        log.resourceType || '',
        log.resourceId || '',
        log.status || '',
        log.ipAddress || '',
        JSON.stringify(log.details || {}),
      ];
    });

    const csv = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
    ].join('\n');

    return csv;
  } catch (error) {
    logger.error('Export audit logs error:', error);
    throw error;
  }
};

export default {
  createAuditLog,
  getAuditLogs,
  getAuditLogById,
  exportAuditLogs,
};
