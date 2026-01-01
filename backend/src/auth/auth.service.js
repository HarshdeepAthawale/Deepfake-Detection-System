/**
 * Authentication Service
 * Handles user authentication, JWT token generation, and validation
 */

import jwt from 'jsonwebtoken';
import User from '../users/user.model.js';
import { ROLES } from '../security/rbac.js';
import config from '../config/env.js';
import logger from '../utils/logger.js';

/**
 * Generate JWT token for user
 * @param {Object} user - User object
 * @returns {string} JWT token
 */
export const generateToken = (user) => {
  const payload = {
    id: user._id.toString(),
    email: user.email,
    operativeId: user.operativeId,
    role: user.role,
  };

  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn,
  });
};

/**
 * Verify JWT token
 * @param {string} token - JWT token
 * @returns {Object} Decoded token payload
 */
export const verifyToken = (token) => {
  try {
    return jwt.verify(token, config.jwt.secret);
  } catch (error) {
    logger.error('Token verification failed:', error.message);
    throw new Error('Invalid or expired token');
  }
};

/**
 * Authenticate user with email and password
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Object} User object and token
 */
export const authenticateUser = async (email, password) => {
  try {
    // Find user and include password field
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    
    if (!user) {
      throw new Error('Invalid credentials');
    }

    if (!user.isActive) {
      throw new Error('Account is deactivated');
    }

    // Compare password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      throw new Error('Invalid credentials');
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    // Generate token
    const token = generateToken(user);

    // Return user without password
    const userObj = user.toJSON();

    logger.info(`User authenticated: ${user.operativeId} (${user.email})`);

    return {
      user: userObj,
      token,
    };
  } catch (error) {
    logger.error('Authentication error:', error);
    throw error;
  }
};

/**
 * Register a new user
 * @param {string} email - User email
 * @param {string} password - User password
 * @param {string} operativeId - Optional operative ID (auto-generated if not provided)
 * @returns {Object} User object and token
 */
export const registerUser = async (email, password, operativeId = null) => {
  try {
    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    // Generate operative ID if not provided
    if (!operativeId) {
      const timestamp = Date.now().toString(36).toUpperCase();
      const random = Math.random().toString(36).substring(2, 6).toUpperCase();
      operativeId = `USER_${timestamp}_${random}`;
    } else {
      // Check if operative ID already exists
      const existingOperativeId = await User.findOne({ operativeId: operativeId.toUpperCase() });
      if (existingOperativeId) {
        throw new Error('Operative ID already exists');
      }
    }

    // Create new user
    const user = new User({
      email: email.toLowerCase(),
      password,
      operativeId: operativeId.toUpperCase(),
      role: ROLES.OPERATIVE, // Default role
      isActive: true,
    });

    await user.save();

    // Generate token
    const token = generateToken(user);

    logger.info(`User registered: ${user.operativeId} (${user.email})`);

    return {
      user: user.toJSON(),
      token,
    };
  } catch (error) {
    logger.error('Registration error:', error);
    throw error;
  }
};

/**
 * Get user by ID
 * @param {string} userId - User ID
 * @returns {Object} User object
 */
export const getUserById = async (userId) => {
  try {
    const user = await User.findById(userId);
    if (!user || !user.isActive) {
      throw new Error('User not found or inactive');
    }
    return user.toJSON();
  } catch (error) {
    logger.error('Get user error:', error);
    throw error;
  }
};

export default {
  generateToken,
  verifyToken,
  authenticateUser,
  registerUser,
  getUserById,
};

