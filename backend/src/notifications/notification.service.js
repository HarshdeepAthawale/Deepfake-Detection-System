/**
 * Notification Service
 * Handles notification operations
 */

import Notification from './notification.model.js';
import User from '../users/user.model.js';
import { sendEmailNotification } from './email.service.js';
import logger from '../utils/logger.js';
// Note: WebSocket notifications are handled separately - socket instance not directly accessible from service

/**
 * Create notification
 * @param {Object} notificationData - Notification data
 * @param {boolean} sendEmail - Whether to send email notification
 * @returns {Promise<Object>} Created notification
 */
export const createNotification = async (notificationData, sendEmail = false) => {
  try {
    const notification = new Notification(notificationData);
    await notification.save();

    // Send email if requested and user has email notifications enabled
    if (sendEmail) {
      try {
        const user = await User.findById(notificationData.userId);
        if (user && user.notificationPreferences?.emailEnabled) {
          // Check if notification type should trigger email
          const shouldSendEmail = 
            notificationData.priority === 'critical' ||
            notificationData.priority === 'high' ||
            (notificationData.type === 'deepfake_detected' && user.notificationPreferences?.emailOnDeepfake) ||
            user.notificationPreferences?.emailOnAll;

          if (shouldSendEmail) {
            await sendEmailNotification(user, notification);
            notification.emailSent = true;
            notification.emailSentAt = new Date();
            await notification.save();
          }
        }
      } catch (emailError) {
        logger.warn('Failed to send email notification:', emailError);
        // Don't fail notification creation if email fails
      }
    }

    // Emit WebSocket notification
    try {
      emitNotification(notificationData.userId.toString(), notification.toObject());
    } catch (socketError) {
      logger.warn('Failed to emit notification via WebSocket:', socketError);
      // Don't fail notification creation if socket fails
    }

    return notification.toObject();
  } catch (error) {
    logger.error('Create notification error:', error);
    throw error;
  }
};

/**
 * Get notifications for user
 * @param {string} userId - User ID
 * @param {Object} filters - Filter options
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @returns {Promise<Object>} Paginated notifications
 */
export const getNotifications = async (userId, filters = {}, page = 1, limit = 50) => {
  try {
    const query = { userId };

    if (filters.read !== undefined) {
      query.read = filters.read === 'true' || filters.read === true;
    }

    if (filters.type) {
      query.type = filters.type;
    }

    if (filters.priority) {
      query.priority = filters.priority;
    }

    const skip = (page - 1) * limit;

    const [notifications, total] = await Promise.all([
      Notification.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Notification.countDocuments(query),
    ]);

    return {
      notifications,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  } catch (error) {
    logger.error('Get notifications error:', error);
    throw error;
  }
};

/**
 * Mark notification as read
 * @param {string} notificationId - Notification ID
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Updated notification
 */
export const markAsRead = async (notificationId, userId) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: notificationId, userId },
      {
        read: true,
        readAt: new Date(),
      },
      { new: true }
    );

    if (!notification) {
      throw new Error('Notification not found or access denied');
    }

    return notification.toObject();
  } catch (error) {
    logger.error('Mark notification as read error:', error);
    throw error;
  }
};

/**
 * Mark all notifications as read for user
 * @param {string} userId - User ID
 * @returns {Promise<number>} Number of notifications marked as read
 */
export const markAllAsRead = async (userId) => {
  try {
    const result = await Notification.updateMany(
      { userId, read: false },
      {
        read: true,
        readAt: new Date(),
      }
    );

    return result.modifiedCount;
  } catch (error) {
    logger.error('Mark all notifications as read error:', error);
    throw error;
  }
};

/**
 * Get unread notification count
 * @param {string} userId - User ID
 * @returns {Promise<number>} Unread count
 */
export const getUnreadCount = async (userId) => {
  try {
    const count = await Notification.countDocuments({ userId, read: false });
    return count;
  } catch (error) {
    logger.error('Get unread notification count error:', error);
    throw error;
  }
};

/**
 * Delete notification
 * @param {string} notificationId - Notification ID
 * @param {string} userId - User ID
 * @returns {Promise<void>}
 */
export const deleteNotification = async (notificationId, userId) => {
  try {
    const notification = await Notification.findOneAndDelete({
      _id: notificationId,
      userId,
    });

    if (!notification) {
      throw new Error('Notification not found or access denied');
    }
  } catch (error) {
    logger.error('Delete notification error:', error);
    throw error;
  }
};

export default {
  createNotification,
  getNotifications,
  markAsRead,
  markAllAsRead,
  getUnreadCount,
  deleteNotification,
};
