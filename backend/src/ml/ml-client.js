/**
 * ML Service Client
 * HTTP client for communicating with external ML service (Python Flask/FastAPI)
 */

import mlConfig, { getHealthCheckUrl, getInferenceUrl, isMLServiceEnabled } from '../config/ml.config.js';
import logger from '../utils/logger.js';

let mlServiceHealthy = false;
let healthCheckInterval = null;

/**
 * Check ML service health
 * @returns {Promise<boolean>} True if service is healthy
 */
export const checkMLServiceHealth = async () => {
  if (!isMLServiceEnabled()) {
    logger.debug('[ML_CLIENT] ML service is disabled');
    return false;
  }

  try {
    const healthUrl = getHealthCheckUrl();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), mlConfig.healthCheckTimeout);

    const response = await fetch(healthUrl, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      mlServiceHealthy = data.status === 'healthy' || data.status === 'ok';

      if (mlServiceHealthy) {
        logger.debug('[ML_CLIENT] ML service is healthy');
      } else {
        logger.warn('[ML_CLIENT] ML service health check returned unhealthy status');
      }

      return mlServiceHealthy;
    } else {
      mlServiceHealthy = false;
      logger.warn(`[ML_CLIENT] ML service health check failed with status: ${response.status}`);
      return false;
    }
  } catch (error) {
    if (error.name === 'AbortError') {
      logger.warn('[ML_CLIENT] ML service health check timed out');
    } else {
      logger.warn(`[ML_CLIENT] ML service health check failed: ${error.message}`);
    }
    mlServiceHealthy = false;
    return false;
  }
};

/**
 * Start periodic health checks
 */
export const startHealthChecks = () => {
  if (healthCheckInterval) {
    return; // Already started
  }

  if (!isMLServiceEnabled()) {
    logger.debug('[ML_CLIENT] ML service is disabled, skipping health checks');
    return;
  }

  // Initial health check
  checkMLServiceHealth().catch((error) => {
    logger.error('[ML_CLIENT] Initial health check failed:', error);
  });

  // Periodic health checks
  healthCheckInterval = setInterval(() => {
    checkMLServiceHealth().catch((error) => {
      logger.error('[ML_CLIENT] Periodic health check failed:', error);
    });
  }, mlConfig.healthCheckInterval);

  logger.info('[ML_CLIENT] Started periodic health checks');
};

/**
 * Stop periodic health checks
 */
export const stopHealthChecks = () => {
  if (healthCheckInterval) {
    clearInterval(healthCheckInterval);
    healthCheckInterval = null;
    logger.info('[ML_CLIENT] Stopped periodic health checks');
  }
};

/**
 * Call ML service for deepfake detection
 * @param {Object} perceptionData - Data from perception agent
 * @returns {Promise<Object>} ML inference results
 */
export const callMLService = async (perceptionData) => {
  if (!isMLServiceEnabled()) {
    throw new Error('ML service is disabled');
  }

  if (!mlServiceHealthy) {
    // Try one more health check before failing
    const isHealthy = await checkMLServiceHealth();
    if (!isHealthy) {
      throw new Error('ML service is not available');
    }
  }

  const inferenceUrl = getInferenceUrl(mlConfig.modelVersion);
  let lastError;

  // Retry logic
  for (let attempt = 1; attempt <= mlConfig.retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), mlConfig.timeout);

      // Prepare request payload
      const payload = {
        hash: perceptionData.hash,
        mediaType: perceptionData.mediaType,
        metadata: perceptionData.metadata,
        // Include extracted frames/audio paths if available
        extractedFrames: perceptionData.extractedFrames || [],
        extractedAudio: perceptionData.extractedAudio || null,
        modelVersion: mlConfig.modelVersion,
      };

      logger.debug(`[ML_CLIENT] Calling ML service (attempt ${attempt}/${mlConfig.retries}): ${inferenceUrl}`);

      const response = await fetch(inferenceUrl, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`ML service returned status ${response.status}: ${errorText}`);
      }

      const result = await response.json();

      logger.info(`[ML_CLIENT] ML inference completed successfully for hash: ${perceptionData.hash.slice(0, 16)}...`);

      // Transform ML service response to match expected format
      return {
        videoScore: result.video_score || result.videoScore || 0,
        audioScore: result.audio_score || result.audioScore || 0,
        ganFingerprint: result.gan_fingerprint || result.ganFingerprint || 0,
        temporalConsistency: result.temporal_consistency || result.temporalConsistency || 0,
        peakRisk: result.peak_risk || result.peakRisk || 0, // NEW
        meanRisk: result.mean_risk || result.meanRisk || 0, // NEW
        riskScore: result.risk_score || result.riskScore || 0,
        confidence: result.confidence || 0,
        modelVersion: result.model_version || mlConfig.modelVersion,
        inferenceTime: result.inference_time || 0,
      };
    } catch (error) {
      lastError = error;

      if (error.name === 'AbortError') {
        logger.warn(`[ML_CLIENT] ML service request timed out (attempt ${attempt}/${mlConfig.retries})`);
      } else {
        logger.warn(`[ML_CLIENT] ML service request failed (attempt ${attempt}/${mlConfig.retries}): ${error.message}`);
      }

      // If not the last attempt, wait before retrying
      if (attempt < mlConfig.retries) {
        await new Promise((resolve) => setTimeout(resolve, mlConfig.retryDelay * attempt));
      }
    }
  }

  // All retries failed
  logger.error(`[ML_CLIENT] ML service request failed after ${mlConfig.retries} attempts: ${lastError.message}`);
  throw new Error(`ML service unavailable after ${mlConfig.retries} attempts: ${lastError.message}`);
};

/**
 * Get ML service status
 * @returns {Promise<Object>} ML service status information
 */
export const getMLServiceStatus = async () => {
  const isHealthy = await checkMLServiceHealth();

  return {
    enabled: isMLServiceEnabled(),
    healthy: isHealthy,
    serviceUrl: mlConfig.serviceUrl,
    modelVersion: mlConfig.modelVersion,
    confidenceThreshold: mlConfig.confidenceThreshold,
    lastChecked: new Date().toISOString(),
  };
};

export default {
  checkMLServiceHealth,
  startHealthChecks,
  stopHealthChecks,
  callMLService,
  getMLServiceStatus,
};
