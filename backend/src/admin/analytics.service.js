/**
 * Analytics Service
 * Aggregates analytics data for dashboard
 */

import Scan from '../scans/scan.model.js';
import User from '../users/user.model.js';
import { cached, makeKey } from '../utils/cache.js';
import logger from '../utils/logger.js';

/**
 * Get analytics overview (summary metrics)
 * @returns {Promise<Object>} Overview analytics
 */
export const getOverview = async () => {
  const cacheKey = makeKey('analytics', 'overview');
  
  return await cached(cacheKey, async () => {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Total counts
    const [
      totalScans,
      totalUsers,
      scansLast24h,
      scansLastWeek,
      scansLastMonth,
      usersLast24h,
      usersLastWeek,
    ] = await Promise.all([
      Scan.countDocuments(),
      User.countDocuments(),
      Scan.countDocuments({ createdAt: { $gte: oneDayAgo } }),
      Scan.countDocuments({ createdAt: { $gte: oneWeekAgo } }),
      Scan.countDocuments({ createdAt: { $gte: oneMonthAgo } }),
      User.countDocuments({ createdAt: { $gte: oneDayAgo } }),
      User.countDocuments({ createdAt: { $gte: oneWeekAgo } }),
    ]);

    // Verdict distribution
    const verdictDistribution = await Scan.aggregate([
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

    const verdicts = {
      DEEPFAKE: 0,
      SUSPICIOUS: 0,
      AUTHENTIC: 0,
    };

    verdictDistribution.forEach((item) => {
      if (verdicts.hasOwnProperty(item._id)) {
        verdicts[item._id] = item.count;
      }
    });

    // Media type distribution
    const mediaDistribution = await Scan.aggregate([
      {
        $group: {
          _id: '$mediaType',
          count: { $sum: 1 },
        },
      },
    ]);

    const mediaTypes = {};
    mediaDistribution.forEach((item) => {
      mediaTypes[item._id] = item.count;
    });

    // Average risk score
    const riskScoreAvg = await Scan.aggregate([
      {
        $match: {
          status: 'COMPLETED',
          'result.riskScore': { $exists: true },
        },
      },
      {
        $group: {
          _id: null,
          avgRiskScore: { $avg: '$result.riskScore' },
        },
      },
    ]);

    const avgRiskScore = riskScoreAvg.length > 0 ? riskScoreAvg[0].avgRiskScore : 0;

    return {
      scans: {
        total: totalScans,
        last24h: scansLast24h,
        lastWeek: scansLastWeek,
        lastMonth: scansLastMonth,
      },
      users: {
        total: totalUsers,
        last24h: usersLast24h,
        lastWeek: usersLastWeek,
      },
      verdicts,
      mediaTypes,
      averageRiskScore: Math.round(avgRiskScore * 100) / 100,
    };
  }, 300); // Cache for 5 minutes
};

/**
 * Get scan trends (daily/weekly/monthly)
 * @param {string} period - 'daily', 'weekly', or 'monthly'
 * @param {number} limit - Number of data points to return
 * @returns {Promise<Array>} Trend data
 */
export const getTrends = async (period = 'daily', limit = 30) => {
  const cacheKey = makeKey('analytics', `trends:${period}:${limit}`);
  
  return await cached(cacheKey, async () => {
    const now = new Date();
    let groupFormat, dateFormat, subtractDays;

    switch (period) {
      case 'daily':
        groupFormat = {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
          day: { $dayOfMonth: '$createdAt' },
        };
        dateFormat = '%Y-%m-%d';
        subtractDays = limit;
        break;
      case 'weekly':
        groupFormat = {
          year: { $year: '$createdAt' },
          week: { $week: '$createdAt' },
        };
        dateFormat = '%Y-W%V';
        subtractDays = limit * 7;
        break;
      case 'monthly':
        groupFormat = {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
        };
        dateFormat = '%Y-%m';
        subtractDays = limit * 30;
        break;
      default:
        groupFormat = {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
          day: { $dayOfMonth: '$createdAt' },
        };
        dateFormat = '%Y-%m-%d';
        subtractDays = limit;
    }

    const startDate = new Date(now.getTime() - subtractDays * 24 * 60 * 60 * 1000);

    // Scan trends
    const scanTrends = await Scan.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: groupFormat,
          count: { $sum: 1 },
          completed: {
            $sum: { $cond: [{ $eq: ['$status', 'COMPLETED'] }, 1, 0] },
          },
          deepfake: {
            $sum: {
              $cond: [{ $eq: ['$result.verdict', 'DEEPFAKE'] }, 1, 0],
            },
          },
          suspicious: {
            $sum: {
              $cond: [{ $eq: ['$result.verdict', 'SUSPICIOUS'] }, 1, 0],
            },
          },
          authentic: {
            $sum: {
              $cond: [{ $eq: ['$result.verdict', 'AUTHENTIC'] }, 1, 0],
            },
          },
          avgRiskScore: {
            $avg: {
              $cond: [
                { $eq: ['$status', 'COMPLETED'] },
                '$result.riskScore',
                null,
              ],
            },
          },
        },
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1, '_id.week': 1 },
      },
      {
        $limit: limit,
      },
    ]);

    // Format dates and calculate averages
    const formattedTrends = scanTrends.map((item) => {
      let dateLabel;
      const id = item._id;

      if (period === 'daily') {
        dateLabel = `${id.year}-${String(id.month).padStart(2, '0')}-${String(id.day).padStart(2, '0')}`;
      } else if (period === 'weekly') {
        dateLabel = `${id.year}-W${String(id.week).padStart(2, '0')}`;
      } else {
        dateLabel = `${id.year}-${String(id.month).padStart(2, '0')}`;
      }

      return {
        date: dateLabel,
        scans: item.count,
        completed: item.completed,
        verdicts: {
          deepfake: item.deepfake,
          suspicious: item.suspicious,
          authentic: item.authentic,
        },
        averageRiskScore: item.avgRiskScore
          ? Math.round(item.avgRiskScore * 100) / 100
          : null,
      };
    });

    return formattedTrends;
  }, 600); // Cache for 10 minutes
};

/**
 * Get user activity analytics
 * @returns {Promise<Object>} User activity metrics
 */
export const getUserActivity = async () => {
  const cacheKey = makeKey('analytics', 'users');
  
  return await cached(cacheKey, async () => {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Users by role
    const usersByRole = await User.aggregate([
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 },
          active: {
            $sum: { $cond: ['$isActive', 1, 0] },
          },
        },
      },
    ]);

    const roleStats = {};
    usersByRole.forEach((item) => {
      roleStats[item._id] = {
        total: item.count,
        active: item.active,
        inactive: item.count - item.active,
      };
    });

    // New users over time
    const newUsersByPeriod = await User.aggregate([
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' },
          },
          count: { $sum: 1 },
        },
      },
      {
        $sort: { '_id.year': -1, '_id.month': -1, '_id.day': -1 },
      },
      {
        $limit: 30,
      },
    ]);

    const newUsersTrend = newUsersByPeriod.map((item) => ({
      date: `${item._id.year}-${String(item._id.month).padStart(2, '0')}-${String(item._id.day).padStart(2, '0')}`,
      count: item.count,
    })).reverse();

    // Top active users (by scan count)
    const topUsers = await Scan.aggregate([
      {
        $group: {
          _id: '$userId',
          scanCount: { $sum: 1 },
          lastScan: { $max: '$createdAt' },
        },
      },
      {
        $sort: { scanCount: -1 },
      },
      {
        $limit: 10,
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user',
        },
      },
      {
        $unwind: '$user',
      },
      {
        $project: {
          userId: '$_id',
          operativeId: '$user.operativeId',
          email: '$user.email',
          role: '$user.role',
          scanCount: 1,
          lastScan: 1,
        },
      },
    ]);

    return {
      byRole: roleStats,
      newUsers: {
        last24h: await User.countDocuments({ createdAt: { $gte: oneDayAgo } }),
        lastWeek: await User.countDocuments({ createdAt: { $gte: oneWeekAgo } }),
        lastMonth: await User.countDocuments({ createdAt: { $gte: oneMonthAgo } }),
        trend: newUsersTrend,
      },
      topActiveUsers: topUsers,
    };
  }, 300); // Cache for 5 minutes
};

/**
 * Get scan analytics
 * @returns {Promise<Object>} Scan analytics
 */
export const getScanAnalytics = async () => {
  const cacheKey = makeKey('analytics', 'scans');
  
  return await cached(cacheKey, async () => {
    // Status distribution
    const statusDistribution = await Scan.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    const statuses = {};
    statusDistribution.forEach((item) => {
      statuses[item._id] = item.count;
    });

    // Verdict distribution
    const verdictDistribution = await Scan.aggregate([
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

    const verdicts = {
      DEEPFAKE: 0,
      SUSPICIOUS: 0,
      AUTHENTIC: 0,
    };

    verdictDistribution.forEach((item) => {
      if (verdicts.hasOwnProperty(item._id)) {
        verdicts[item._id] = item.count;
      }
    });

    // Media type distribution
    const mediaDistribution = await Scan.aggregate([
      {
        $group: {
          _id: '$mediaType',
          count: { $sum: 1 },
        },
      },
    ]);

    const mediaTypes = {};
    mediaDistribution.forEach((item) => {
      mediaTypes[item._id] = item.count;
    });

    // Risk score distribution
    const riskScoreDistribution = await Scan.aggregate([
      {
        $match: {
          status: 'COMPLETED',
          'result.riskScore': { $exists: true },
        },
      },
      {
        $bucket: {
          groupBy: '$result.riskScore',
          boundaries: [0, 20, 40, 60, 80, 100],
          default: 'other',
          output: {
            count: { $sum: 1 },
          },
        },
      },
    ]);

    const riskScoreBuckets = {
      '0-20': 0,
      '21-40': 0,
      '41-60': 0,
      '61-80': 0,
      '81-100': 0,
    };

    riskScoreDistribution.forEach((item) => {
      const key = item._id === 'other' ? 'other' : `${item._id}-${item._id + 20}`;
      if (riskScoreBuckets.hasOwnProperty(key)) {
        riskScoreBuckets[key] = item.count;
      }
    });

    // Average confidence and risk scores
    const scoreAverages = await Scan.aggregate([
      {
        $match: {
          status: 'COMPLETED',
          'result.confidence': { $exists: true },
          'result.riskScore': { $exists: true },
        },
      },
      {
        $group: {
          _id: null,
          avgConfidence: { $avg: '$result.confidence' },
          avgRiskScore: { $avg: '$result.riskScore' },
        },
      },
    ]);

    const averages = scoreAverages.length > 0
      ? {
          confidence: Math.round(scoreAverages[0].avgConfidence * 100) / 100,
          riskScore: Math.round(scoreAverages[0].avgRiskScore * 100) / 100,
        }
      : { confidence: 0, riskScore: 0 };

    return {
      statuses,
      verdicts,
      mediaTypes,
      riskScoreDistribution: riskScoreBuckets,
      averages,
    };
  }, 300); // Cache for 5 minutes
};

export default {
  getOverview,
  getTrends,
  getUserActivity,
  getScanAnalytics,
};
