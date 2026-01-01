/**
 * Authentication Controller
 * Handles authentication-related HTTP requests
 */

import { authenticateUser, registerUser } from './auth.service.js';
import { authenticateWithGoogle } from './google-auth.service.js';
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
 * Register endpoint handler
 * POST /api/auth/register
 */
export const register = async (req, res) => {
  try {
    const { email, password, operativeId } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Email and password are required',
      });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Invalid email format',
      });
    }

    // Password validation (min 6 characters)
    if (password.length < 6) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Password must be at least 6 characters long',
      });
    }

    // Register user
    const { user, token } = await registerUser(email, password, operativeId);

    logger.info(`Registration successful: ${user.operativeId}`);

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      data: {
        user,
        token,
      },
    });
  } catch (error) {
    logger.error('Registration error:', error);
    
    const statusCode = error.message.includes('already exists') || error.message.includes('Validation error')
      ? 400
      : 500;

    res.status(statusCode).json({
      error: 'Registration failed',
      message: error.message || 'An error occurred during registration',
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

/**
 * Google OAuth endpoint handler
 * POST /api/auth/google
 */
export const googleAuth = async (req, res) => {
  try {
    const { idToken } = req.body;

    // Validation
    if (!idToken) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Google ID token is required',
      });
    }

    // Authenticate with Google
    const { user, token } = await authenticateWithGoogle(idToken);

    logger.info(`Google authentication successful: ${user.operativeId}`);

    res.status(200).json({
      success: true,
      message: 'Google authentication successful',
      data: {
        user,
        token,
      },
    });
  } catch (error) {
    logger.error('Google authentication error:', error);
    
    const statusCode = error.message.includes('Invalid') || error.message.includes('Failed')
      ? 401
      : 500;

    res.status(statusCode).json({
      error: 'Google authentication failed',
      message: error.message || 'An error occurred during Google authentication',
    });
  }
};

export default {
  login,
  register,
  getCurrentUser,
  googleAuth,
};

