/**
 * Analytics Controller
 * Handles analytics HTTP requests
 */

import {
  getOverview,
  getTrends,
  getUserActivity,
  getScanAnalytics,
} from './analytics.service.js';
import logger from '../utils/logger.js';

/**
 * Get analytics overview
 * GET /api/admin/analytics/overview
 */
export const getAnalyticsOverview = async (req, res) => {
  try {
    const data = await getOverview();
    
    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    logger.error('Get analytics overview error:', error);
    res.status(500).json({
      error: 'Failed to fetch analytics overview',
      message: error.message,
    });
  }
};

/**
 * Get scan trends
 * GET /api/admin/analytics/trends?period=daily&limit=30
 */
export const getAnalyticsTrends = async (req, res) => {
  try {
    const { period = 'daily', limit = 30 } = req.query;
    const limitNum = parseInt(limit, 10);
    
    if (!['daily', 'weekly', 'monthly'].includes(period)) {
      return res.status(400).json({
        error: 'Invalid period',
        message: 'Period must be one of: daily, weekly, monthly',
      });
    }

    if (isNaN(limitNum) || limitNum < 1 || limitNum > 365) {
      return res.status(400).json({
        error: 'Invalid limit',
        message: 'Limit must be a number between 1 and 365',
      });
    }

    const data = await getTrends(period, limitNum);
    
    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    logger.error('Get analytics trends error:', error);
    res.status(500).json({
      error: 'Failed to fetch analytics trends',
      message: error.message,
    });
  }
};

/**
 * Get user activity analytics
 * GET /api/admin/analytics/users
 */
export const getAnalyticsUsers = async (req, res) => {
  try {
    const data = await getUserActivity();
    
    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    logger.error('Get analytics users error:', error);
    res.status(500).json({
      error: 'Failed to fetch user activity analytics',
      message: error.message,
    });
  }
};

/**
 * Get scan analytics
 * GET /api/admin/analytics/scans
 */
export const getAnalyticsScans = async (req, res) => {
  try {
    const data = await getScanAnalytics();
    
    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    logger.error('Get analytics scans error:', error);
    res.status(500).json({
      error: 'Failed to fetch scan analytics',
      message: error.message,
    });
  }
};

export default {
  getAnalyticsOverview,
  getAnalyticsTrends,
  getAnalyticsUsers,
  getAnalyticsScans,
};
