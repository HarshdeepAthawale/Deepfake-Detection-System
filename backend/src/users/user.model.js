/**
 * User Model
 * MongoDB schema for user accounts with RBAC
 */

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { ROLES } from '../security/rbac.js';

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: function() {
        return !this.googleId; // Password required only if not Google user
      },
      select: false, // Don't return password by default
    },
    googleId: {
      type: String,
      unique: true,
      sparse: true, // Allows multiple null values
    },
    authProvider: {
      type: String,
      enum: ['local', 'google'],
      default: 'local',
    },
    operativeId: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    role: {
      type: String,
      enum: Object.values(ROLES),
      default: ROLES.OPERATIVE,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastLogin: {
      type: Date,
    },
    metadata: {
      firstName: String,
      lastName: String,
      department: String,
      clearanceLevel: {
        type: String,
        enum: ['PUBLIC', 'CONFIDENTIAL', 'SECRET', 'TOP_SECRET'],
        default: 'CONFIDENTIAL',
      },
    },
    notificationPreferences: {
      emailEnabled: {
        type: Boolean,
        default: true,
      },
      emailOnDeepfake: {
        type: Boolean,
        default: true,
      },
      emailOnAll: {
        type: Boolean,
        default: false,
      },
      inAppEnabled: {
        type: Boolean,
        default: true,
      },
    },
  },
  {
    timestamps: true,
    collection: 'users',
  }
);

// Validate only one admin exists
userSchema.pre('save', async function (next) {
  // Only check if this is a new admin or role is being changed to admin
  if (this.role === ROLES.ADMIN) {
    try {
      const UserModel = this.constructor;
      // Check if another admin already exists
      const existingAdmin = await UserModel.findOne({ 
        role: ROLES.ADMIN,
        _id: { $ne: this._id } // Exclude current user if updating
      });
      
      if (existingAdmin) {
        return next(new Error('Only one admin user is allowed in the system'));
      }
    } catch (error) {
      return next(error);
    }
  }
  next();
});

// Hash password before saving (only for local auth)
userSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) return next();
  
  // Skip password hashing for Google OAuth users
  if (this.authProvider === 'google') return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Method to get user without sensitive data
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  // Convert _id to id for frontend compatibility
  obj.id = obj._id.toString();
  delete obj._id;
  delete obj.__v;
  return obj;
};

// Indexes
// Note: email, operativeId, and googleId already have indexes from 'unique: true'
// Only add explicit indexes for non-unique fields
userSchema.index({ role: 1 });

const User = mongoose.model('User', userSchema);

export default User;

