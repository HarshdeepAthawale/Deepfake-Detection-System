/**
 * Perception Agent
 * Handles media pre-processing, signal extraction, and normalization
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { generateFileHash } from '../security/encryption.js';
import { extractFrames, extractAudio, getMediaMetadata, normalizeMedia, extractGPSFromImage } from '../utils/ffmpeg.js';
import logger from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Process media file through perception agent
 * @param {string} filePath - Path to media file
 * @param {string} scanId - Unique scan ID
 * @returns {Promise<Object>} Perception results
 */
export const processMedia = async (filePath, scanId) => {
  try {
    logger.info(`[PERCEPTION_AGENT] Starting perception processing for scan: ${scanId}`);

    // Read file buffer for hashing
    const fileBuffer = fs.readFileSync(filePath);
    const hash = generateFileHash(fileBuffer);

    // Get media metadata
    let metadata;
    try {
      metadata = await getMediaMetadata(filePath);
    } catch (error) {
      logger.warn(`[PERCEPTION_AGENT] Could not extract metadata (may be audio/image): ${error.message}`);
      metadata = {
        format: {
          format_name: path.extname(filePath).slice(1),
          duration: 0,
          size: fileBuffer.length,
        },
      };
    }

    // Determine media type
    // Determine media type
    const ext = path.extname(filePath).toLowerCase();
    const formatName = metadata.format?.format_name?.toLowerCase() || '';

    // Robust type detection
    const isVideo = ['mp4', 'avi', 'mov', 'webm', 'mkv'].some(t => formatName.includes(t) || ext.includes(t));
    const isAudio = ['mp3', 'wav', 'mpeg', 'aac'].some(t => formatName.includes(t) || ext.includes(t));
    const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'tiff', 'image2'].some(t => formatName.includes(t) || ext.includes(t));

    logger.info(`[PERCEPTION_AGENT] Determined media type: Video=${isVideo}, Audio=${isAudio}, Image=${isImage} (Format: ${formatName}, Ext: ${ext})`);

    // Create processing directory
    const processingDir = path.join(__dirname, '../../uploads/processing', scanId);
    if (!fs.existsSync(processingDir)) {
      fs.mkdirSync(processingDir, { recursive: true });
    }

    const perceptionResults = {
      hash,
      mediaType: isVideo ? 'VIDEO' : isAudio ? 'AUDIO' : isImage ? 'IMAGE' : 'UNKNOWN',
      duration: metadata.format?.duration || 0,
      size: fileBuffer.length,
      metadata: {
        format: metadata.format?.format_name,
        bitrate: metadata.format?.bit_rate,
        codec: metadata.streams?.[0]?.codec_name,
        width: metadata.streams?.find(s => s.width)?.width,
        height: metadata.streams?.find(s => s.height)?.height,
        sampleRate: metadata.streams?.find(s => s.sample_rate)?.sample_rate,
        channels: metadata.streams?.find(s => s.channels)?.channels,
      },
      extractedFrames: [],
      extractedAudio: null,
      normalizedPath: null,
      gpsCoordinates: null,
    };

    // Extract GPS coordinates if image
    if (isImage) {
      try {
        const gpsData = await extractGPSFromImage(filePath);
        if (gpsData) {
          perceptionResults.gpsCoordinates = gpsData;
          logger.info(`[PERCEPTION_AGENT] GPS coordinates extracted: ${gpsData.latitude}, ${gpsData.longitude}`);
        }
      } catch (error) {
        logger.warn(`[PERCEPTION_AGENT] GPS extraction failed: ${error.message}`);
      }
    }

    // Extract frames if video
    if (isVideo) {
      try {
        const framesDir = path.join(processingDir, 'frames');
        // Increase frame rate to capture more temporal data (4fps)
        // Limit to max 60 frames to prevent OOM
        const frames = await extractFrames(filePath, framesDir, 4, 60);
        perceptionResults.extractedFrames = frames;
        logger.info(`[PERCEPTION_AGENT] Extracted ${frames.length} frames`);
      } catch (error) {
        logger.warn(`[PERCEPTION_AGENT] Frame extraction failed: ${error.message}`);
      }
    } else if (isImage) {
      // For images, the "frame" is just the image file itself
      perceptionResults.extractedFrames = [filePath];
    }

    // Extract audio if video
    if (isVideo) {
      try {
        const audioPath = path.join(processingDir, 'audio.wav');
        await extractAudio(filePath, audioPath);
        perceptionResults.extractedAudio = audioPath;
        logger.info(`[PERCEPTION_AGENT] Audio extracted`);
      } catch (error) {
        logger.warn(`[PERCEPTION_AGENT] Audio extraction failed: ${error.message}`);
      }
    }

    // Normalize media (optional, for consistency)
    // In production, you might want to normalize all media to a standard format
    // For now, we'll skip normalization to preserve original quality

    logger.info(`[PERCEPTION_AGENT] Perception processing complete for scan: ${scanId}`);

    return perceptionResults;
  } catch (error) {
    logger.error(`[PERCEPTION_AGENT] Error processing media: ${error.message}`);
    throw new Error(`Perception agent failed: ${error.message}`);
  }
};

export default {
  processMedia,
};

