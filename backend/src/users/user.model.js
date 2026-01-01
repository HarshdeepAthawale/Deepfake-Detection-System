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
      index: true,
    },
    password: {
      type: String,
      required: true,
      select: false, // Don't return password by default
    },
    operativeId: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
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
  },
  {
    timestamps: true,
    collection: 'users',
  }
);

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  
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
  return obj;
};

// Indexes
userSchema.index({ email: 1 });
userSchema.index({ operativeId: 1 });
userSchema.index({ role: 1 });

const User = mongoose.model('User', userSchema);

export default User;

