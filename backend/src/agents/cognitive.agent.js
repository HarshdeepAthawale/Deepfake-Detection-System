/**
 * Cognitive Agent (Enhanced)
 * Converts raw ML scores into human-readable intelligence reports
 * with context-aware thresholding and uncertainty estimation
 */

import logger from '../utils/logger.js';

/**
 * Calculate dynamic thresholds based on context
 * @param {Object} perceptionData - Media metadata
 * @param {Object} detectionResults - Detection scores
 * @returns {Object} Adjusted thresholds
 */
const calculateDynamicThresholds = (perceptionData, detectionResults) => {
  let deepfakeThreshold = 75;
  let suspiciousThreshold = 40;

  // Adjust for media quality
  const bitrate = perceptionData.metadata?.bitrate || 0;
  if (bitrate > 0 && bitrate < 2000000) {
    // Low quality media - be more lenient
    deepfakeThreshold += 5;
    suspiciousThreshold += 5;
  }

  // Adjust for uncertainty
  const uncertainty = detectionResults.uncertainty || 0;
  if (uncertainty > 20) {
    // High uncertainty - require higher confidence
    deepfakeThreshold += 10;
    suspiciousThreshold += 5;
  }

  // Adjust for media type
  if (perceptionData.mediaType === 'IMAGE') {
    // Images are easier to analyze - be stricter
    deepfakeThreshold -= 5;
  } else if (perceptionData.mediaType === 'VIDEO' && detectionResults.frameCount > 10) {
    // Many frames analyzed - higher confidence
    deepfakeThreshold -= 5;
  }

  return {
    deepfakeThreshold: Math.max(60, Math.min(85, deepfakeThreshold)),
    suspiciousThreshold: Math.max(30, Math.min(50, suspiciousThreshold)),
  };
};

/**
 * Generate rich, context-aware explanations
 * @param {Object} detectionResults - Detection scores
 * @param {Object} perceptionData - Perception data
 * @returns {Array} Detailed explanations
 */
const generateRichExplanations = (detectionResults, perceptionData) => {
  const explanations = [];
  const riskScore = detectionResults.riskScore;
  const videoScore = detectionResults.videoScore || 0;
  const audioScore = detectionResults.audioScore || 0;
  const ganFingerprint = detectionResults.ganFingerprint || 0;
  const temporalConsistency = detectionResults.temporalConsistency || 100;
  const uncertainty = detectionResults.uncertainty || 0;
  const frameCount = detectionResults.frameCount || 1;

  const peakRisk = detectionResults.peakRisk || 0;
  const meanRisk = detectionResults.meanRisk || 0;

  // Video/Image analysis
  if (videoScore > 75) {
    explanations.push({
      type: 'critical',
      message: 'Strong facial manipulation indicators detected',
      confidence: 'high',
      details: `Model detected ${Math.round(videoScore)}% probability of synthetic facial features (P90)`
    });
  } else if (videoScore > 60) {
    explanations.push({
      type: 'warning',
      message: 'Significant facial inconsistencies observed',
      confidence: 'medium',
      details: 'Biometric analysis shows anomalies in facial structure or expression'
    });
  } else if (videoScore > 40) {
    explanations.push({
      type: 'info',
      message: 'Minor facial analysis discrepancies noted',
      confidence: 'low',
      details: 'Some facial features show slight irregularities'
    });
  }

  // Check for localized deepfakes (Peak Risk significantly higher than P90/Average)
  if (peakRisk > videoScore + 15 && peakRisk > 70) {
    explanations.push({
      type: 'critical',
      message: 'Localized deepfake segments detected',
      confidence: 'high',
      details: `Specific frames show very high manipulation probability (${Math.round(peakRisk)}%) despite lower average scores.`
    });
  }

  // Audio analysis
  if (audioScore > 70) {
    explanations.push({
      type: 'critical',
      message: 'Synthetic voice patterns identified',
      confidence: 'high',
      details: 'Spectral analysis reveals AI-generated audio artifacts'
    });
  } else if (audioScore > 50) {
    explanations.push({
      type: 'warning',
      message: 'Audio-phonetic misalignment detected',
      confidence: 'medium',
      details: 'Voice characteristics show inconsistencies with natural speech'
    });
  }

  // GAN artifacts
  if (ganFingerprint > 75) {
    explanations.push({
      type: 'critical',
      message: 'GAN-generated artifacts identified',
      confidence: 'high',
      details: 'High-frequency texture patterns consistent with generative AI models'
    });
  } else if (ganFingerprint > 55) {
    explanations.push({
      type: 'warning',
      message: 'Potential AI-generated content signatures detected',
      confidence: 'medium',
      details: 'Some visual patterns suggest synthetic generation'
    });
  }

  // Temporal consistency (for videos)
  if (perceptionData.mediaType === 'VIDEO') {
    if (temporalConsistency < 50) {
      explanations.push({
        type: 'critical',
        message: 'Severe temporal inconsistencies across frames',
        confidence: 'high',
        details: `Frame-to-frame analysis shows ${100 - temporalConsistency}% inconsistency`
      });
    } else if (temporalConsistency < 70) {
      explanations.push({
        type: 'warning',
        message: 'Temporal inconsistencies detected',
        confidence: 'medium',
        details: 'Video frames show irregular patterns over time'
      });
    } else if (temporalConsistency >= 90) {
      explanations.push({
        type: 'positive',
        message: 'High temporal consistency observed',
        confidence: 'high',
        details: `${frameCount} frames analyzed with ${temporalConsistency}% consistency`
      });
    }
  }

  // Compression artifacts
  if (detectionResults.compressionAnalysis?.artifacts?.length > 0) {
    detectionResults.compressionAnalysis.artifacts.forEach((artifact) => {
      explanations.push({
        type: 'info',
        message: artifact,
        confidence: 'low',
        details: 'Compression analysis finding'
      });
    });
  }

  // Uncertainty warning
  if (uncertainty > 25) {
    explanations.push({
      type: 'warning',
      message: 'High prediction uncertainty detected',
      confidence: 'low',
      details: `Analysis variance: ${uncertainty}% - manual review recommended`
    });
  }

  // Default if no specific findings
  if (explanations.length === 0) {
    if (riskScore > 70) {
      explanations.push({
        type: 'warning',
        message: 'Multiple deepfake indicators detected',
        confidence: 'medium',
        details: 'Combined analysis suggests potential manipulation'
      });
    } else if (riskScore > 30) {
      explanations.push({
        type: 'info',
        message: 'Some suspicious patterns identified',
        confidence: 'low',
        details: 'Requires manual review for confirmation'
      });
    } else {
      explanations.push({
        type: 'positive',
        message: 'Media appears authentic',
        confidence: 'high',
        details: 'No significant manipulation indicators found'
      });
    }
  }

  return explanations;
};

/**
 * Generate human-readable explanations from detection scores
 * @param {Object} detectionResults - Results from detection and compression agents
 * @param {Object} perceptionData - Data from perception agent
 * @returns {Promise<Object>} Final analysis with explanations
 */
export const generateExplanations = async (detectionResults, perceptionData) => {
  try {
    logger.info(`[COGNITIVE_AGENT] Generating human-readable explanations`);

    const riskScore = detectionResults.riskScore;
    const confidence = detectionResults.confidence || 0;
    const uncertainty = detectionResults.uncertainty || 0;
    const peakRisk = detectionResults.peakRisk || 0;
    const meanRisk = detectionResults.meanRisk || 0;

    // Calculate dynamic thresholds
    const thresholds = calculateDynamicThresholds(perceptionData, detectionResults);

    // Generate rich explanations
    const richExplanations = generateRichExplanations(detectionResults, perceptionData);

    // Determine final verdict with dynamic thresholds
    let verdict;
    let verdictConfidence;

    if (riskScore >= thresholds.deepfakeThreshold) {
      verdict = 'DEEPFAKE';
      verdictConfidence = confidence;
    } else if (riskScore >= thresholds.suspiciousThreshold) {
      verdict = 'SUSPICIOUS';
      verdictConfidence = Math.max(50, confidence - 10); // Lower confidence for suspicious
    } else {
      verdict = 'AUTHENTIC';
      verdictConfidence = Math.min(100, 100 - riskScore); // Invert for authentic
    }

    // Adjust confidence based on uncertainty
    if (uncertainty > 20) {
      verdictConfidence = Math.max(50, verdictConfidence - uncertainty / 2);
    }

    const finalResult = {
      status: verdict,
      verdict: verdict,
      confidence: Math.round(verdictConfidence),
      riskScore: riskScore,
      explanations: richExplanations.map(e => e.message), // Simple array for backward compatibility
      detailedExplanations: richExplanations, // Rich format
      metadata: {
        facialMatch: 100 - (detectionResults.videoScore || 0),
        audioMatch: detectionResults.audioScore > 0 ? 100 - detectionResults.audioScore : 0,
        ganFingerprint: detectionResults.ganFingerprint || 0,
        temporalConsistency: detectionResults.temporalConsistency || 100,
        uncertainty: uncertainty,
        frameCount: detectionResults.frameCount || 1,
        thresholds: thresholds,
        peakRisk: Math.round(peakRisk),
        meanRisk: Math.round(meanRisk),
      },
    };

    logger.info(`[COGNITIVE_AGENT] Final verdict: ${verdict} (Confidence: ${finalResult.confidence}%, Uncertainty: ${uncertainty}%)`);
    logger.info(`[COGNITIVE_AGENT] Thresholds used: Deepfake=${thresholds.deepfakeThreshold}, Suspicious=${thresholds.suspiciousThreshold}`);

    return finalResult;
  } catch (error) {
    logger.error(`[COGNITIVE_AGENT] Explanation generation error: ${error.message}`);
    throw new Error(`Cognitive agent failed: ${error.message}`);
  }
};

export default {
  generateExplanations,
  calculateDynamicThresholds, // Export for testing
};
