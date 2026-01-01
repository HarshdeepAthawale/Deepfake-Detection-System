/**
 * Authentication Controller
 * Handles authentication-related HTTP requests
 */

import { authenticateUser } from './auth.service.js';
import logger from '../utils/logger.js';

/**
 * Login endpoint handler
 * POST /api/auth/login
 */
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Email and password are required',
      });
    }

    // Authenticate user
    const { user, token } = await authenticateUser(email, password);

    logger.info(`Login successful: ${user.operativeId}`);

    res.status(200).json({
      success: true,
      message: 'Authentication successful',
      data: {
        user,
        token,
      },
    });
  } catch (error) {
    logger.error('Login error:', error);
    
    const statusCode = error.message === 'Invalid credentials' || error.message === 'Account is deactivated'
      ? 401
      : 500;

    res.status(statusCode).json({
      error: 'Authentication failed',
      message: error.message || 'An error occurred during authentication',
    });
  }
};

/**
 * Get current user profile
 * GET /api/auth/me
 */
export const getCurrentUser = async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      data: {
        user: req.user,
      },
    });
  } catch (error) {
    logger.error('Get current user error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to retrieve user information',
    });
  }
};

export default {
  login,
  getCurrentUser,
};

