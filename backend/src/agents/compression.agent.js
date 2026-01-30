/**
 * Compression-Aware Agent (Enhanced)
 * Analyzes recompression artifacts, quality metrics, and adjusts risk scores
 */

import logger from '../utils/logger.js';

/**
 * Assess media quality based on metadata
 * @param {Object} metadata - Media metadata
 * @returns {Object} Quality assessment
 */
const assessMediaQuality = (metadata) => {
  const bitrate = metadata.bitrate || 0;
  const width = metadata.width || 0;
  const height = metadata.height || 0;
  const codec = metadata.codec || 'unknown';

  let qualityScore = 100;
  const qualityIssues = [];

  // Bitrate assessment
  if (bitrate > 0) {
    const bitrateMbps = bitrate / 1000000;
    const pixels = width * height;
    const bitsPerPixel = pixels > 0 ? bitrate / pixels : 0;

    if (bitrateMbps < 1) {
      qualityScore -= 30;
      qualityIssues.push('Very low bitrate - heavy compression');
    } else if (bitrateMbps < 3) {
      qualityScore -= 15;
      qualityIssues.push('Low bitrate - moderate compression');
    } else if (bitrateMbps < 5) {
      qualityScore -= 5;
      qualityIssues.push('Moderate bitrate');
    }

    // Bits per pixel analysis
    if (bitsPerPixel > 0 && bitsPerPixel < 0.1) {
      qualityScore -= 20;
      qualityIssues.push('Extremely low bits-per-pixel ratio');
    }
  }

  // Resolution assessment
  if (width > 0 && height > 0) {
    const pixels = width * height;
    if (pixels < 640 * 480) {
      qualityScore -= 20;
      qualityIssues.push('Low resolution');
    } else if (pixels < 1280 * 720) {
      qualityScore -= 10;
      qualityIssues.push('Below HD resolution');
    }
  }

  return {
    qualityScore: Math.max(0, qualityScore),
    qualityIssues,
    bitsPerPixel: bitrate > 0 && width > 0 && height > 0 ? (bitrate / (width * height)).toFixed(3) : 0,
  };
};

/**
 * Analyze codec and compression patterns
 * @param {Object} metadata - Media metadata
 * @returns {Object} Codec analysis
 */
const analyzeCodec = (metadata) => {
  const codec = (metadata.codec || 'unknown').toLowerCase();
  let suspicionScore = 0;
  const codecFindings = [];

  // Modern codecs (potentially suspicious if combined with other factors)
  if (codec.includes('h265') || codec.includes('hevc')) {
    codecFindings.push('H.265/HEVC codec detected');
    suspicionScore += 2;
  } else if (codec.includes('vp9')) {
    codecFindings.push('VP9 codec detected');
    suspicionScore += 3;
  } else if (codec.includes('av1')) {
    codecFindings.push('AV1 codec detected - modern compression');
    suspicionScore += 4;
  } else if (codec.includes('h264') || codec.includes('avc')) {
    codecFindings.push('H.264/AVC codec - standard');
    suspicionScore += 0;
  }

  // Check for unusual codec combinations
  if (codec.includes('mjpeg') || codec.includes('motion jpeg')) {
    codecFindings.push('MJPEG codec - unusual for modern media');
    suspicionScore += 10;
  }

  return {
    suspicionScore,
    codecFindings,
  };
};

/**
 * Analyze compression artifacts and adjust detection scores
 * @param {Object} perceptionData - Data from perception agent
 * @param {Object} detectionScores - Scores from detection agent
 * @returns {Promise<Object>} Adjusted scores with compression analysis
 */
export const analyzeCompression = async (perceptionData, detectionScores) => {
  try {
    logger.info(`[COMPRESSION_AGENT] Analyzing compression artifacts`);

    const metadata = perceptionData.metadata || {};

    // Assess media quality
    const qualityAssessment = assessMediaQuality(metadata);

    // Analyze codec
    const codecAnalysis = analyzeCodec(metadata);

    // Combine all compression-related findings
    const compressionArtifacts = [
      ...qualityAssessment.qualityIssues,
      ...codecAnalysis.codecFindings,
    ];

    // Calculate compression impact
    // Low quality makes us less confident, but shouldn't necessarily increase risk
    // unless there are specific suspicious codec findings.

    // Only increase risk for codec suspicion (e.g. MJPEG)
    const compressionRiskImpact = codecAnalysis.suspicionScore;

    // Adjust scores
    const adjustedRiskScore = Math.min(100, detectionScores.riskScore + compressionRiskImpact);

    // Reduce confidence if quality is poor (Harder to detect deepfakes)
    let confidenceReduction = 0;

    if (qualityAssessment.qualityScore < 40) {
      confidenceReduction = 25; // Significant reduction for very poor quality
    } else if (qualityAssessment.qualityScore < 60) {
      confidenceReduction = 15;
    } else if (qualityAssessment.qualityScore < 80) {
      confidenceReduction = 5;
    }

    const adjustedConfidence = Math.max(0, detectionScores.confidence - confidenceReduction);

    const compressionResults = {
      ...detectionScores,
      riskScore: Math.round(adjustedRiskScore),
      confidence: Math.round(adjustedConfidence),
      compressionAnalysis: {
        bitrate: metadata.bitrate || 0,
        codec: metadata.codec || 'unknown',
        compressionImpact: compressionRiskImpact,
        qualityScore: qualityAssessment.qualityScore,
        bitsPerPixel: qualityAssessment.bitsPerPixel,
        artifacts: compressionArtifacts,
      },
    };

    logger.info(`[COMPRESSION_AGENT] Compression analysis complete`);
    logger.info(`[COMPRESSION_AGENT] Quality Score: ${qualityAssessment.qualityScore}, Impact: +${compressionImpact} risk`);
    logger.info(`[COMPRESSION_AGENT] Adjusted Risk: ${compressionResults.riskScore}, Confidence: ${compressionResults.confidence}%`);

    return compressionResults;
  } catch (error) {
    logger.error(`[COMPRESSION_AGENT] Compression analysis error: ${error.message}`);
    // Return original scores if compression analysis fails
    return detectionScores;
  }
};

export default {
  analyzeCompression,
  assessMediaQuality, // Export for testing
};
