/**
 * Case Model
 * MongoDB schema for case management
 */

import mongoose from 'mongoose';

const caseSchema = new mongoose.Schema(
  {
    caseId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
    },
    status: {
      type: String,
      enum: ['open', 'investigating', 'resolved', 'closed'],
      default: 'open',
      index: true,
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium',
      index: true,
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    operativeId: {
      type: String,
      required: true,
      index: true,
    },
    scanIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Scan',
      },
    ],
    tags: {
      type: [String],
      default: [],
      index: true,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
    },
    resolvedAt: {
      type: Date,
    },
    closedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    collection: 'cases',
  }
);

// Indexes for efficient queries
caseSchema.index({ createdAt: -1 });
caseSchema.index({ status: 1, createdAt: -1 });
caseSchema.index({ assignedTo: 1, status: 1 });
caseSchema.index({ createdBy: 1, createdAt: -1 });
caseSchema.index({ operativeId: 1, createdAt: -1 });
caseSchema.index({ priority: 1, status: 1 });

const Case = mongoose.model('Case', caseSchema);

export default Case;
