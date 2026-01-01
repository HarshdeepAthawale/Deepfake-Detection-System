/**
 * Compression-Aware Agent
 * Analyzes recompression artifacts and adjusts risk scores
 */

import logger from '../utils/logger.js';

/**
 * Analyze compression artifacts and adjust detection scores
 * @param {Object} perceptionData - Data from perception agent
 * @param {Object} detectionScores - Scores from detection agent
 * @returns {Promise<Object>} Adjusted scores with compression analysis
 */
export const analyzeCompression = async (perceptionData, detectionScores) => {
  try {
    logger.info(`[COMPRESSION_AGENT] Analyzing compression artifacts`);

    // Simulate processing time
    await new Promise((resolve) => setTimeout(resolve, 300));

    const metadata = perceptionData.metadata || {};
    const bitrate = metadata.bitrate || 0;
    const codec = metadata.codec || 'unknown';

    // Analyze compression quality
    let compressionScore = 0;
    let compressionArtifacts = [];

    // Low bitrate suggests heavy compression (potential deepfake indicator)
    if (bitrate > 0) {
      const bitrateMbps = bitrate / 1000000;
      
      if (bitrateMbps < 2) {
        compressionScore += 15;
        compressionArtifacts.push('Low bitrate detected - possible compression artifacts');
      } else if (bitrateMbps < 5) {
        compressionScore += 8;
        compressionArtifacts.push('Moderate compression detected');
      }
    }

    // Codec analysis
    if (codec.includes('h264') || codec.includes('h265')) {
      // Standard codecs - neutral
      compressionScore += 0;
    } else if (codec.includes('vp9') || codec.includes('av1')) {
      // Modern codecs - slightly suspicious if combined with low quality
      compressionScore += 3;
    }

    // Adjust risk score based on compression analysis
    const adjustedRiskScore = Math.min(100, detectionScores.riskScore + compressionScore);
    const adjustedConfidence = Math.min(100, detectionScores.confidence + (compressionScore * 0.5));

    const compressionResults = {
      ...detectionScores,
      riskScore: Math.round(adjustedRiskScore),
      confidence: Math.round(adjustedConfidence),
      compressionAnalysis: {
        bitrate: bitrate,
        codec: codec,
        compressionScore: compressionScore,
        artifacts: compressionArtifacts,
      },
    };

    logger.info(`[COMPRESSION_AGENT] Compression analysis complete. Adjusted Risk: ${compressionResults.riskScore}`);

    return compressionResults;
  } catch (error) {
    logger.error(`[COMPRESSION_AGENT] Compression analysis error: ${error.message}`);
    // Return original scores if compression analysis fails
    return detectionScores;
  }
};

export default {
  analyzeCompression,
};

