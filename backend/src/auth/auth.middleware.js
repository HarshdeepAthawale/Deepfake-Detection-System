/**
 * Authentication Middleware
 * Protects routes by verifying JWT tokens
 */

import { verifyToken, getUserById } from './auth.service.js';
import logger from '../utils/logger.js';

/**
 * Middleware to authenticate requests using JWT
 */
export const authenticate = async (req, res, next) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        error: 'Unauthorized: No token provided',
        message: 'Please provide a valid authentication token',
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token
    const decoded = verifyToken(token);

    // Get user data
    const user = await getUserById(decoded.id);
    
    // Attach user to request
    req.user = user;
    req.token = token;

    next();
  } catch (error) {
    logger.warn(`Authentication failed: ${error.message}`);
    return res.status(401).json({ 
      error: 'Unauthorized: Invalid or expired token',
      message: error.message,
    });
  }
};

/**
 * Optional authentication middleware (doesn't fail if no token)
 */
export const optionalAuthenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const decoded = verifyToken(token);
      const user = await getUserById(decoded.id);
      req.user = user;
      req.token = token;
    }
    
    next();
  } catch (error) {
    // Continue without authentication if token is invalid
    next();
  }
};

export default {
  authenticate,
  optionalAuthenticate,
};

