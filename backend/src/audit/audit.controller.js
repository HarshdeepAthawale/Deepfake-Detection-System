/**
 * Audit Controller
 * Handles audit log HTTP requests
 */

import { getAuditLogs, getAuditLogById, exportAuditLogs } from './audit.service.js';
import logger from '../utils/logger.js';

/**
 * Get audit logs with filtering
 * GET /api/admin/audit?userId=...&action=...&startDate=...&endDate=...&page=1&limit=50
 */
export const getAuditLogsHandler = async (req, res) => {
  try {
    const {
      userId,
      operativeId,
      action,
      resourceType,
      resourceId,
      status,
      startDate,
      endDate,
      page = 1,
      limit = 50,
    } = req.query;

    const filters = {
      userId,
      operativeId,
      action,
      resourceType,
      resourceId,
      status,
      startDate,
      endDate,
    };

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);

    const result = await getAuditLogs(filters, pageNum, limitNum);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('Get audit logs error:', error);
    res.status(500).json({
      error: 'Failed to fetch audit logs',
      message: error.message,
    });
  }
};

/**
 * Get audit log by ID
 * GET /api/admin/audit/:id
 */
export const getAuditLogByIdHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const log = await getAuditLogById(id);

    res.status(200).json({
      success: true,
      data: log,
    });
  } catch (error) {
    logger.error('Get audit log by ID error:', error);
    if (error.message === 'Audit log not found') {
      return res.status(404).json({
        error: 'Audit log not found',
        message: error.message,
      });
    }
    res.status(500).json({
      error: 'Failed to fetch audit log',
      message: error.message,
    });
  }
};

/**
 * Export audit logs as CSV
 * GET /api/admin/audit/export?userId=...&action=...&startDate=...&endDate=...
 */
export const exportAuditLogsHandler = async (req, res) => {
  try {
    const {
      userId,
      operativeId,
      action,
      resourceType,
      resourceId,
      status,
      startDate,
      endDate,
    } = req.query;

    const filters = {
      userId,
      operativeId,
      action,
      resourceType,
      resourceId,
      status,
      startDate,
      endDate,
    };

    const csv = await exportAuditLogs(filters);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=audit-logs-${Date.now()}.csv`);
    res.status(200).send(csv);
  } catch (error) {
    logger.error('Export audit logs error:', error);
    res.status(500).json({
      error: 'Failed to export audit logs',
      message: error.message,
    });
  }
};

export default {
  getAuditLogsHandler,
  getAuditLogByIdHandler,
  exportAuditLogsHandler,
};
