/**
 * Admin Controller
 * Handles admin-specific HTTP requests (system statistics)
 */

import Scan from '../scans/scan.model.js';
import User from '../users/user.model.js';
import logger from '../utils/logger.js';
import { getMLServiceStatus, checkMLServiceHealth } from '../ml/ml-client.js';
import mlConfig from '../config/ml.config.js';
import { cached, makeKey } from '../utils/cache.js';

/**
 * Get system-wide statistics
 * GET /api/admin/stats
 */
export const getAdminStats = async (req, res) => {
  try {
    // Cache admin stats for 1-5 minutes (using 3 minutes)
    const cacheKey = makeKey('admin', 'stats');
    
    const stats = await cached(cacheKey, async () => {
      // User statistics
      const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ isActive: true });
    
    // Users by role
    const usersByRole = await User.aggregate([
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 },
        },
      },
    ]);

    const roleStats = {};
    usersByRole.forEach((item) => {
      roleStats[item._id] = item.count;
    });

    // Scan statistics
    const totalScans = await Scan.countDocuments();
    const completedScans = await Scan.countDocuments({ status: 'COMPLETED' });
    const pendingScans = await Scan.countDocuments({ status: 'PENDING' });
    const processingScans = await Scan.countDocuments({ status: 'PROCESSING' });
    const failedScans = await Scan.countDocuments({ status: 'FAILED' });

    // Results breakdown
    const resultsBreakdown = await Scan.aggregate([
      {
        $match: {
          status: 'COMPLETED',
          'result.verdict': { $exists: true },
        },
      },
      {
        $group: {
          _id: '$result.verdict',
          count: { $sum: 1 },
        },
      },
    ]);

    const verdictStats = {
      DEEPFAKE: 0,
      SUSPICIOUS: 0,
      AUTHENTIC: 0,
    };

    resultsBreakdown.forEach((item) => {
      if (verdictStats.hasOwnProperty(item._id)) {
        verdictStats[item._id] = item.count;
      }
    });

    // Media type breakdown
    const mediaTypeBreakdown = await Scan.aggregate([
      {
        $group: {
          _id: '$mediaType',
          count: { $sum: 1 },
        },
      },
    ]);

    const mediaStats = {};
    mediaTypeBreakdown.forEach((item) => {
      mediaStats[item._id] = item.count;
    });

    // Recent activity (last 24 hours)
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);
    
    const scansLast24h = await Scan.countDocuments({
      createdAt: { $gte: oneDayAgo },
    });

    const usersLast24h = await User.countDocuments({
      createdAt: { $gte: oneDayAgo },
    });

      return {
        users: {
          total: totalUsers,
          active: activeUsers,
          inactive: totalUsers - activeUsers,
          byRole: {
            admin: roleStats.admin || 0,
            operative: roleStats.operative || 0,
            analyst: roleStats.analyst || 0,
          },
          newLast24h: usersLast24h,
        },
        scans: {
          total: totalScans,
          completed: completedScans,
          pending: pendingScans,
          processing: processingScans,
          failed: failedScans,
          byVerdict: verdictStats,
          byMediaType: mediaStats,
          newLast24h: scansLast24h,
        },
        system: {
          health: 'operational',
          uptime: process.uptime(),
        },
      };
    }, 180); // Cache for 3 minutes

    res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    logger.error('Get admin stats error:', error);
    res.status(500).json({
      error: 'Failed to fetch admin statistics',
      message: error.message,
    });
  }
};

/**
 * Get ML service health status
 * GET /api/admin/ml/health
 */
export const getMLHealth = async (req, res) => {
  try {
    const status = await getMLServiceStatus();
    
    res.status(200).json({
      success: true,
      data: status,
    });
  } catch (error) {
    logger.error('Get ML health error:', error);
    res.status(500).json({
      error: 'Failed to fetch ML service status',
      message: error.message,
    });
  }
};

/**
 * Get ML service configuration
 * GET /api/admin/ml/config
 */
export const getMLConfigEndpoint = async (req, res) => {
  try {
    // Don't expose sensitive information
    const safeConfig = {
      serviceUrl: mlConfig.serviceUrl,
      enabled: mlConfig.enabled,
      timeout: mlConfig.timeout,
      retries: mlConfig.retries,
      modelVersion: mlConfig.modelVersion,
      confidenceThreshold: mlConfig.confidenceThreshold,
    };
    
    res.status(200).json({
      success: true,
      data: safeConfig,
    });
  } catch (error) {
    logger.error('Get ML config error:', error);
    res.status(500).json({
      error: 'Failed to fetch ML configuration',
      message: error.message,
    });
  }
};

export default {
  getAdminStats,
  getMLHealth,
  getMLConfigEndpoint,
};

