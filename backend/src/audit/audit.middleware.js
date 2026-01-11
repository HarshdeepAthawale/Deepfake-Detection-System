/**
 * Audit Middleware
 * Middleware for automatic audit logging
 */

import { createAuditLog } from './audit.service.js';
import logger from '../utils/logger.js';

/**
 * Create audit middleware for specific actions
 * @param {string} action - Action name (e.g., 'user.create', 'scan.delete')
 * @param {Function} getResourceData - Function to extract resource data from request
 * @returns {Function} Express middleware
 */
export const auditMiddleware = (action, getResourceData = null) => {
  return async (req, res, next) => {
    // Store original json method
    const originalJson = res.json.bind(res);

    // Override res.json to capture response
    res.json = function (data) {
      // Log audit entry after response
      logAuditEntry(req, res, action, getResourceData, data)
        .catch((error) => {
          logger.warn('Audit logging failed (non-blocking):', error);
        });

      // Call original json method
      return originalJson(data);
    };

    next();
  };
};

/**
 * Log audit entry
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {string} action - Action name
 * @param {Function} getResourceData - Function to extract resource data
 * @param {Object} responseData - Response data
 */
const logAuditEntry = async (req, res, action, getResourceData, responseData) => {
  try {
    const user = req.user;
    if (!user) {
      return; // Don't log if user is not authenticated
    }

    const resourceData = getResourceData ? getResourceData(req, res, responseData) : {};

    const auditData = {
      action,
      userId: user.id,
      operativeId: user.operativeId,
      userRole: user.role,
      resourceType: resourceData.resourceType || extractResourceType(req.path),
      resourceId: resourceData.resourceId || extractResourceId(req),
      details: {
        method: req.method,
        path: req.path,
        body: sanitizeBody(req.body),
        params: req.params,
        query: req.query,
        ...resourceData.details,
      },
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('user-agent'),
      status: res.statusCode >= 200 && res.statusCode < 400 ? 'success' : 'failure',
      errorMessage: responseData?.error || responseData?.message || null,
    };

    await createAuditLog(auditData);
  } catch (error) {
    // Don't throw - audit logging should not break the application
    logger.warn('Failed to create audit log:', error);
  }
};

/**
 * Extract resource type from path
 * @param {string} path - Request path
 * @returns {string} Resource type
 */
const extractResourceType = (path) => {
  if (path.includes('/scans')) return 'scan';
  if (path.includes('/users')) return 'user';
  if (path.includes('/auth')) return 'auth';
  if (path.includes('/admin')) return 'system';
  if (path.includes('/cases')) return 'case';
  if (path.includes('/notifications')) return 'notification';
  return 'system';
};

/**
 * Extract resource ID from request
 * @param {Object} req - Express request
 * @returns {string} Resource ID
 */
const extractResourceId = (req) => {
  return req.params.id || req.params.scanId || req.params.userId || req.body.id || null;
};

/**
 * Sanitize request body to remove sensitive data
 * @param {Object} body - Request body
 * @returns {Object} Sanitized body
 */
const sanitizeBody = (body) => {
  if (!body || typeof body !== 'object') {
    return body;
  }

  const sensitiveFields = ['password', 'token', 'secret', 'key', 'authorization'];
  const sanitized = { ...body };

  for (const field of sensitiveFields) {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  }

  return sanitized;
};

/**
 * Manual audit log helper
 * @param {Object} req - Express request
 * @param {string} action - Action name
 * @param {Object} details - Additional details
 * @param {string} status - Status (success/failure/error)
 */
export const logAudit = async (req, action, details = {}, status = 'success') => {
  try {
    const user = req.user;
    if (!user) {
      return;
    }

    const auditData = {
      action,
      userId: user.id,
      operativeId: user.operativeId,
      userRole: user.role,
      resourceType: extractResourceType(req.path),
      resourceId: extractResourceId(req),
      details,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('user-agent'),
      status,
    };

    await createAuditLog(auditData);
  } catch (error) {
    logger.warn('Failed to create manual audit log:', error);
  }
};

export default {
  auditMiddleware,
  logAudit,
};
