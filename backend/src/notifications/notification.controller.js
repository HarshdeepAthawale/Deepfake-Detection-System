/**
 * Notification Controller
 * Handles notification HTTP requests
 */

import {
  getNotifications,
  markAsRead,
  markAllAsRead,
  getUnreadCount,
  deleteNotification,
} from './notification.service.js';
import logger from '../utils/logger.js';

/**
 * Get notifications for current user
 * GET /api/notifications
 */
export const getNotificationsHandler = async (req, res) => {
  try {
    const user = req.user;
    const page = parseInt(req.query.page || '1', 10);
    const limit = parseInt(req.query.limit || '50', 10);
    const filters = {
      read: req.query.read,
      type: req.query.type,
      priority: req.query.priority,
    };

    const result = await getNotifications(user.id, filters, page, limit);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('Get notifications error:', error);
    res.status(500).json({
      error: 'Failed to fetch notifications',
      message: error.message,
    });
  }
};

/**
 * Get unread notification count
 * GET /api/notifications/unread-count
 */
export const getUnreadCountHandler = async (req, res) => {
  try {
    const user = req.user;
    const count = await getUnreadCount(user.id);

    res.status(200).json({
      success: true,
      data: { count },
    });
  } catch (error) {
    logger.error('Get unread count error:', error);
    res.status(500).json({
      error: 'Failed to fetch unread count',
      message: error.message,
    });
  }
};

/**
 * Mark notification as read
 * PATCH /api/notifications/:id/read
 */
export const markAsReadHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;

    const notification = await markAsRead(id, user.id);

    res.status(200).json({
      success: true,
      message: 'Notification marked as read',
      data: notification,
    });
  } catch (error) {
    logger.error('Mark notification as read error:', error);
    if (error.message === 'Notification not found or access denied') {
      return res.status(404).json({
        error: 'Notification not found',
        message: error.message,
      });
    }
    res.status(500).json({
      error: 'Failed to mark notification as read',
      message: error.message,
    });
  }
};

/**
 * Mark all notifications as read
 * PATCH /api/notifications/read-all
 */
export const markAllAsReadHandler = async (req, res) => {
  try {
    const user = req.user;
    const count = await markAllAsRead(user.id);

    res.status(200).json({
      success: true,
      message: 'All notifications marked as read',
      data: { count },
    });
  } catch (error) {
    logger.error('Mark all notifications as read error:', error);
    res.status(500).json({
      error: 'Failed to mark all notifications as read',
      message: error.message,
    });
  }
};

/**
 * Delete notification
 * DELETE /api/notifications/:id
 */
export const deleteNotificationHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;

    await deleteNotification(id, user.id);

    res.status(200).json({
      success: true,
      message: 'Notification deleted successfully',
    });
  } catch (error) {
    logger.error('Delete notification error:', error);
    if (error.message === 'Notification not found or access denied') {
      return res.status(404).json({
        error: 'Notification not found',
        message: error.message,
      });
    }
    res.status(500).json({
      error: 'Failed to delete notification',
      message: error.message,
    });
  }
};

export default {
  getNotificationsHandler,
  getUnreadCountHandler,
  markAsReadHandler,
  markAllAsReadHandler,
  deleteNotificationHandler,
};
