/**
 * User Controller
 * Handles user management HTTP requests
 */

import {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  getUserStats,
} from './user.service.js';
import logger from '../utils/logger.js';
import { logAudit } from '../audit/audit.middleware.js';

/**
 * Get all users with pagination
 * GET /api/users
 */
export const getUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const filters = {
      role: req.query.role,
      isActive: req.query.isActive,
      search: req.query.search,
    };

    const result = await getAllUsers(page, limit, filters);

    res.status(200).json({
      success: true,
      data: result.users,
      pagination: result.pagination,
    });
  } catch (error) {
    logger.error('Get users error:', error);
    res.status(500).json({
      error: 'Failed to fetch users',
      message: error.message,
    });
  }
};

/**
 * Get user by ID
 * GET /api/users/:id
 */
export const getUser = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await getUserById(id);

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    logger.error('Get user error:', error);
    const statusCode = error.message === 'User not found' ? 404 : 500;
    res.status(statusCode).json({
      error: 'Failed to fetch user',
      message: error.message,
    });
  }
};

/**
 * Create new user
 * POST /api/users
 */
export const createUserHandler = async (req, res) => {
  try {
    const userData = req.body;

    // Validation
    if (!userData.email) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Email is required',
      });
    }

    // Password required for local auth
    if (!userData.password && !userData.googleId) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Password is required for local authentication',
      });
    }

    const user = await createUser(userData);

    // Audit log
    await logAudit(req, 'user.create', {
      userId: user.id,
      email: user.email,
      operativeId: user.operativeId,
      role: user.role,
    }, 'success');

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: user,
    });
  } catch (error) {
    logger.error('Create user error:', error);
    const statusCode = 
      error.message.includes('already exists') || 
      error.message.includes('Only one admin') 
        ? 400 
        : 500;
    
    res.status(statusCode).json({
      error: 'Failed to create user',
      message: error.message,
    });
  }
};

/**
 * Update user
 * PUT /api/users/:id
 */
export const updateUserHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const userData = req.body;

    const user = await updateUser(id, userData);

    // Audit log
    await logAudit(req, 'user.update', {
      userId: id,
      changes: userData,
    }, 'success');

    res.status(200).json({
      success: true,
      message: 'User updated successfully',
      data: user,
    });
  } catch (error) {
    logger.error('Update user error:', error);
    const statusCode = 
      error.message === 'User not found' 
        ? 404 
        : error.message.includes('already') || error.message.includes('Only one admin')
        ? 400
        : 500;
    
    res.status(statusCode).json({
      error: 'Failed to update user',
      message: error.message,
    });
  }
};

/**
 * Delete user
 * DELETE /api/users/:id
 */
export const deleteUserHandler = async (req, res) => {
  try {
    const { id } = req.params;
    await deleteUser(id);

    // Audit log
    await logAudit(req, 'user.delete', {
      userId: id,
    }, 'success');

    res.status(200).json({
      success: true,
      message: 'User deleted successfully',
    });
  } catch (error) {
    logger.error('Delete user error:', error);
    const statusCode = 
      error.message === 'User not found' 
        ? 404 
        : error.message.includes('Cannot delete admin')
        ? 403
        : 500;
    
    res.status(statusCode).json({
      error: 'Failed to delete user',
      message: error.message,
    });
  }
};

/**
 * Get user statistics
 * GET /api/users/stats
 */
export const getStats = async (req, res) => {
  try {
    const stats = await getUserStats();

    res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    logger.error('Get user stats error:', error);
    res.status(500).json({
      error: 'Failed to fetch user statistics',
      message: error.message,
    });
  }
};

export default {
  getUsers,
  getUser,
  createUserHandler,
  updateUserHandler,
  deleteUserHandler,
  getStats,
};

