/**
 * Detection Agent
 * Core ML inference simulation for deepfake detection
 * This uses mock logic until real ML models are integrated
 */

import logger from '../utils/logger.js';

/**
 * Mock deepfake detection inference
 * In production, this would call actual ML models (Python, TensorFlow, etc.)
 * @param {Object} perceptionData - Data from perception agent
 * @returns {Promise<Object>} Detection scores
 */
export const detectDeepfake = async (perceptionData) => {
  try {
    logger.info(`[DETECTION_AGENT] Starting deepfake detection analysis`);

    // Simulate processing time
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Deterministic + random logic for realistic results
    const hash = perceptionData.hash || '';
    const mediaType = perceptionData.mediaType;
    
    // Use hash to create deterministic but varied results
    // Extract part of hash after 'sha256:' prefix (skip first 7 chars, take next 8)
    const hashSubstring = hash.length >= 15 ? hash.slice(7, 15) : hash.slice(-8) || '0';
    const hashSeed = parseInt(hashSubstring, 16) || 12345; // Fallback seed if parsing fails
    
    // Video-specific detection
    let videoScore = 0;
    let audioScore = 0;
    
    if (mediaType === 'VIDEO') {
      // Simulate facial biometric analysis
      videoScore = 30 + (hashSeed % 70); // Range: 30-100
      
      // Simulate audio analysis if audio was extracted
      if (perceptionData.extractedAudio) {
        audioScore = 20 + ((hashSeed * 3) % 80); // Range: 20-100
      }
    } else if (mediaType === 'AUDIO') {
      // Audio-only analysis
      audioScore = 25 + (hashSeed % 75); // Range: 25-100
      videoScore = 0;
    } else if (mediaType === 'IMAGE') {
      // Image analysis
      videoScore = 35 + (hashSeed % 65); // Range: 35-100
      audioScore = 0;
    }

    // GAN fingerprint detection (simulated)
    const ganFingerprint = 40 + ((hashSeed * 2) % 60); // Range: 40-100
    
    // Temporal consistency (for videos)
    // Higher value = more consistent = lower risk (authentic)
    // Range: 50-100 where 100 = perfectly consistent, 50 = inconsistent
    const temporalConsistency = perceptionData.mediaType === 'VIDEO'
      ? 50 + ((hashSeed * 5) % 50) // Range: 50-100
      : 100; // Non-video media defaults to high consistency

    // Convert to temporal inconsistency for risk calculation
    // Higher consistency (100) = 0 inconsistency (low risk)
    // Lower consistency (50) = 50 inconsistency (higher risk)
    const temporalInconsistency = 100 - temporalConsistency;

    // Calculate overall risk score
    // Higher scores = higher risk (more likely to be deepfake)
    const riskScore = Math.round(
      (videoScore * 0.4) +
      (audioScore * 0.3) +
      (ganFingerprint * 0.2) +
      (temporalInconsistency * 0.1)
    );

    const detectionResults = {
      videoScore: Math.round(videoScore),
      audioScore: Math.round(audioScore),
      ganFingerprint: Math.round(ganFingerprint),
      temporalConsistency: Math.round(temporalConsistency),
      riskScore: Math.min(100, Math.max(0, riskScore)),
      confidence: Math.min(100, Math.max(50, riskScore + (hashSeed % 20) - 10)),
    };

    logger.info(`[DETECTION_AGENT] Detection complete. Risk Score: ${detectionResults.riskScore}`);

    return detectionResults;
  } catch (error) {
    logger.error(`[DETECTION_AGENT] Detection error: ${error.message}`);
    throw new Error(`Detection agent failed: ${error.message}`);
  }
};

export default {
  detectDeepfake,
};

