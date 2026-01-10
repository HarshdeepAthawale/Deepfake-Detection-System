/**
 * Cognitive Agent
 * Converts raw ML scores into human-readable intelligence reports
 */

import logger from '../utils/logger.js';

/**
 * Generate human-readable explanations from detection scores
 * @param {Object} detectionResults - Results from detection and compression agents
 * @param {Object} perceptionData - Data from perception agent
 * @returns {Promise<Object>} Final analysis with explanations
 */
export const generateExplanations = async (detectionResults, perceptionData) => {
  try {
    logger.info(`[COGNITIVE_AGENT] Generating human-readable explanations`);

    // Simulate processing time
    await new Promise((resolve) => setTimeout(resolve, 500));

    const explanations = [];
    const riskScore = detectionResults.riskScore;
    const videoScore = detectionResults.videoScore || 0;
    const audioScore = detectionResults.audioScore || 0;
    const ganFingerprint = detectionResults.ganFingerprint || 0;
    const temporalConsistency = detectionResults.temporalConsistency || 0;

    // Generate explanations based on scores
    if (videoScore > 70) {
      explanations.push('High confidence facial biometric anomalies detected');
    } else if (videoScore > 50) {
      explanations.push('Moderate facial inconsistencies observed');
    } else if (videoScore > 0) {
      explanations.push('Minor facial analysis discrepancies noted');
    }

    if (audioScore > 70) {
      explanations.push('Synthetic voice spectral artifacts identified');
    } else if (audioScore > 50) {
      explanations.push('Audio-phonetic misalignment detected');
    } else if (audioScore > 0) {
      explanations.push('Subtle audio inconsistencies found');
    }

    if (ganFingerprint > 70) {
      explanations.push('GAN-generated artifacts identified in high-frequency textures');
    } else if (ganFingerprint > 50) {
      explanations.push('Potential AI-generated content signatures detected');
    }

    // Temporal consistency: Higher = more consistent (authentic), Lower = inconsistent (suspicious)
    // Flag when consistency is low (< 60), indicating temporal inconsistencies
    if (temporalConsistency > 0 && temporalConsistency < 60) {
      explanations.push('Temporal inconsistencies across video frames');
    } else if (temporalConsistency >= 90 && perceptionData.mediaType === 'VIDEO') {
      // High temporal consistency is a positive indicator (authentic)
      explanations.push('High temporal consistency observed across video frames');
    }

    // Compression artifacts
    if (detectionResults.compressionAnalysis?.artifacts?.length > 0) {
      detectionResults.compressionAnalysis.artifacts.forEach((artifact) => {
        explanations.push(artifact);
      });
    }

    // Default explanations if none generated
    if (explanations.length === 0) {
      if (riskScore > 70) {
        explanations.push('Multiple deepfake indicators detected');
      } else if (riskScore > 40) {
        explanations.push('Suspicious patterns identified - requires manual review');
      } else {
        explanations.push('Media appears authentic based on current analysis');
      }
    }

    // Determine final verdict
    let verdict;
    if (riskScore >= 75) {
      verdict = 'DEEPFAKE';
    } else if (riskScore >= 40) {
      verdict = 'SUSPICIOUS';
    } else {
      verdict = 'AUTHENTIC';
    }

    const finalResult = {
      status: verdict,
      verdict: verdict,
      confidence: Math.round(detectionResults.confidence),
      riskScore: riskScore,
      explanations: explanations,
      metadata: {
        facialMatch: 100 - videoScore, // Invert for "match" score
        audioMatch: audioScore > 0 ? 100 - audioScore : 0,
        ganFingerprint: ganFingerprint,
        temporalConsistency: temporalConsistency,
      },
    };

    logger.info(`[COGNITIVE_AGENT] Final verdict: ${verdict} (Confidence: ${finalResult.confidence}%)`);

    return finalResult;
  } catch (error) {
    logger.error(`[COGNITIVE_AGENT] Explanation generation error: ${error.message}`);
    throw new Error(`Cognitive agent failed: ${error.message}`);
  }
};

export default {
  generateExplanations,
};

