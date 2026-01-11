/**
 * Scan Model
 * MongoDB schema for deepfake detection scans
 */

import mongoose from 'mongoose';

const scanSchema = new mongoose.Schema(
  {
    scanId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    userId: {
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
    fileName: {
      type: String,
      required: true,
    },
    filePath: {
      type: String,
      required: true,
    },
    fileHash: {
      type: String,
      required: true,
    },
    fileSize: {
      type: Number,
      required: true,
    },
    mediaType: {
      type: String,
      enum: ['VIDEO', 'AUDIO', 'IMAGE', 'UNKNOWN'],
      required: true,
    },
    mimeType: {
      type: String,
    },
    gpsCoordinates: {
      latitude: {
        type: Number,
      },
      longitude: {
        type: Number,
      },
    },
    status: {
      type: String,
      enum: ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'],
      default: 'PENDING',
      index: true,
    },
    result: {
      status: {
        type: String,
        enum: ['DEEPFAKE', 'SUSPICIOUS', 'AUTHENTIC'],
      },
      verdict: {
        type: String,
        enum: ['DEEPFAKE', 'SUSPICIOUS', 'AUTHENTIC'],
      },
      confidence: {
        type: Number,
        min: 0,
        max: 100,
      },
      riskScore: {
        type: Number,
        min: 0,
        max: 100,
      },
      explanations: [String],
      metadata: {
        facialMatch: Number,
        audioMatch: Number,
        ganFingerprint: Number,
        temporalConsistency: Number,
      },
    },
    processingData: {
      perception: mongoose.Schema.Types.Mixed,
      detection: mongoose.Schema.Types.Mixed,
      compression: mongoose.Schema.Types.Mixed,
      cognitive: mongoose.Schema.Types.Mixed,
    },
    error: {
      message: String,
      stack: String,
    },
    tags: {
      type: [String],
      default: [],
      index: true,
    },
    batchId: {
      type: String,
      index: true,
    },
    sharedWith: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: 'User',
      default: [],
      index: true,
    },
    comments: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        operativeId: {
          type: String,
          required: true,
        },
        text: {
          type: String,
          required: true,
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    caseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Case',
      index: true,
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
  },
  {
    timestamps: true,
    collection: 'scans',
  }
);

// Indexes for efficient queries
scanSchema.index({ userId: 1, createdAt: -1 });
scanSchema.index({ operativeId: 1, createdAt: -1 });
scanSchema.index({ status: 1, createdAt: -1 });
scanSchema.index({ 'result.status': 1 });
scanSchema.index({ 'result.verdict': 1 });
scanSchema.index({ fileHash: 1 });
scanSchema.index({ createdAt: -1 });
scanSchema.index({ tags: 1 });
scanSchema.index({ mediaType: 1 });

// Text index for full-text search
scanSchema.index({ 
  fileName: 'text', 
  'result.explanations': 'text',
  operativeId: 'text',
});

const Scan = mongoose.model('Scan', scanSchema);

export default Scan;

