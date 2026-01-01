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
scanSchema.index({ fileHash: 1 });
scanSchema.index({ createdAt: -1 });

const Scan = mongoose.model('Scan', scanSchema);

export default Scan;

