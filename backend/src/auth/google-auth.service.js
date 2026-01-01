/**
 * Google OAuth Service
 * Handles Google OAuth authentication and user creation/authentication
 */

import User from '../users/user.model.js';
import { generateToken } from './auth.service.js';
import { ROLES } from '../security/rbac.js';
import config from '../config/env.js';
import logger from '../utils/logger.js';

/**
 * Verify Google ID token and get user info
 * @param {string} idToken - Google ID token from frontend
 * @returns {Object} Google user info
 */
export const verifyGoogleToken = async (idToken) => {
  try {
    // Verify token with Google's tokeninfo endpoint
    const response = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`
    );

    if (!response.ok) {
      throw new Error('Invalid Google token');
    }

    const tokenInfo = await response.json();

    // Verify the token is for our app
    if (config.google.clientId && tokenInfo.aud !== config.google.clientId) {
      throw new Error('Token audience mismatch');
    }

    return {
      googleId: tokenInfo.sub,
      email: tokenInfo.email,
      emailVerified: tokenInfo.email_verified === 'true',
      name: tokenInfo.name,
      picture: tokenInfo.picture,
      givenName: tokenInfo.given_name,
      familyName: tokenInfo.family_name,
    };
  } catch (error) {
    logger.error('Google token verification error:', error);
    throw new Error('Failed to verify Google token');
  }
};

/**
 * Authenticate or register user with Google OAuth
 * @param {string} idToken - Google ID token
 * @returns {Object} User object and JWT token
 */
export const authenticateWithGoogle = async (idToken) => {
  try {
    // Verify Google token
    const googleUser = await verifyGoogleToken(idToken);

    if (!googleUser.emailVerified) {
      throw new Error('Google email not verified');
    }

    // Check if user exists by Google ID
    let user = await User.findOne({ googleId: googleUser.googleId });

    if (!user) {
      // Check if user exists by email (for linking accounts)
      user = await User.findOne({ email: googleUser.email.toLowerCase() });

      if (user) {
        // Link Google account to existing user
        user.googleId = googleUser.googleId;
        user.authProvider = 'google';
        await user.save();
      } else {
        // Create new user
        const timestamp = Date.now().toString(36).toUpperCase();
        const random = Math.random().toString(36).substring(2, 6).toUpperCase();
        const operativeId = `USER_${timestamp}_${random}`;

        user = new User({
          email: googleUser.email.toLowerCase(),
          googleId: googleUser.googleId,
          operativeId: operativeId,
          role: ROLES.OPERATIVE,
          authProvider: 'google',
          isActive: true,
          metadata: {
            firstName: googleUser.givenName || '',
            lastName: googleUser.familyName || '',
          },
        });

        await user.save();
        logger.info(`Google user registered: ${user.operativeId} (${user.email})`);
      }
    } else {
      // Update last login
      user.lastLogin = new Date();
      await user.save({ validateBeforeSave: false });
      logger.info(`Google user authenticated: ${user.operativeId} (${user.email})`);
    }

    // Generate JWT token
    const token = generateToken(user);

    return {
      user: user.toJSON(),
      token,
    };
  } catch (error) {
    logger.error('Google authentication error:', error);
    throw error;
  }
};

export default {
  verifyGoogleToken,
  authenticateWithGoogle,
};

