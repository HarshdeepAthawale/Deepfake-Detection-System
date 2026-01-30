/**
 * FFmpeg Utility Wrapper
 * Handles media processing operations (frame extraction, audio extraction, etc.)
 */

import ffmpeg from 'fluent-ffmpeg';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import exifr from 'exifr';
import config from '../config/env.js';
import logger from './logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Set FFmpeg paths if configured
if (config.ffmpeg.ffmpegPath !== 'ffmpeg') {
  ffmpeg.setFfmpegPath(config.ffmpeg.ffmpegPath);
}
if (config.ffmpeg.ffprobePath !== 'ffprobe') {
  ffmpeg.setFfprobePath(config.ffmpeg.ffprobePath);
}

/**
 * Extract frames from video file
 * @param {string} inputPath - Path to input video file
 * @param {string} outputDir - Directory to save extracted frames
 * @param {number} frameRate - Frames per second to extract (default: 1)
 * @returns {Promise<string[]>} Array of frame file paths
 */
/**
 * Extract frames from video file
 * @param {string} inputPath - Path to input video file
 * @param {string} outputDir - Directory to save extracted frames
 * @param {number} frameRate - Frames per second to extract (default: 1)
 * @param {number} maxFrames - Maximum number of frames to extract (default: 60)
 * @returns {Promise<string[]>} Array of frame file paths
 */
export const extractFrames = async (inputPath, outputDir, frameRate = 1, maxFrames = 60) => {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const outputOptions = [
      `-vf fps=${frameRate}`,
      '-q:v 2', // High quality
    ];

    // Add max frames limit if specified
    if (maxFrames && maxFrames > 0) {
      outputOptions.push(`-vframes ${maxFrames}`);
    }

    ffmpeg(inputPath)
      .outputOptions(outputOptions)
      .output(join(outputDir, 'frame_%04d.jpg'))
      .on('start', (commandLine) => {
        logger.debug(`FFmpeg frame extraction started: ${commandLine}`);
      })
      .on('end', () => {
        // Collect all frame files
        const files = fs.readdirSync(outputDir);
        const frameFiles = files
          .filter((f) => f.startsWith('frame_') && f.endsWith('.jpg'))
          .map((f) => join(outputDir, f))
          .sort();
        logger.info(`Extracted ${frameFiles.length} frames from video`);
        resolve(frameFiles);
      })
      .on('error', (err) => {
        logger.error('FFmpeg frame extraction error:', err);
        reject(err);
      })
      .run();
  });
};

/**
 * Extract audio from video file
 * @param {string} inputPath - Path to input video file
 * @param {string} outputPath - Path to save extracted audio
 * @returns {Promise<string>} Path to extracted audio file
 */
export const extractAudio = async (inputPath, outputPath) => {
  return new Promise((resolve, reject) => {
    const outputDir = dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    ffmpeg(inputPath)
      .outputOptions([
        '-vn', // No video
        '-acodec pcm_s16le', // PCM 16-bit
        '-ar 44100', // Sample rate
        '-ac 2', // Stereo
      ])
      .output(outputPath)
      .on('start', (commandLine) => {
        logger.debug(`FFmpeg audio extraction started: ${commandLine}`);
      })
      .on('end', () => {
        logger.info(`Audio extracted to: ${outputPath}`);
        resolve(outputPath);
      })
      .on('error', (err) => {
        logger.error('FFmpeg audio extraction error:', err);
        reject(err);
      })
      .run();
  });
};

/**
 * Get media metadata
 * @param {string} inputPath - Path to media file
 * @returns {Promise<Object>} Media metadata
 */
export const getMediaMetadata = async (inputPath) => {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(inputPath, (err, metadata) => {
      if (err) {
        logger.error('FFprobe metadata error:', err);
        reject(err);
        return;
      }
      resolve(metadata);
    });
  });
};

/**
 * Normalize media file (convert to standard format)
 * @param {string} inputPath - Path to input file
 * @param {string} outputPath - Path to save normalized file
 * @returns {Promise<string>} Path to normalized file
 */
export const normalizeMedia = async (inputPath, outputPath) => {
  return new Promise((resolve, reject) => {
    const outputDir = dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    ffmpeg(inputPath)
      .outputOptions([
        '-c:v libx264',
        '-preset medium',
        '-crf 23',
        '-c:a aac',
        '-b:a 192k',
      ])
      .output(outputPath)
      .on('start', (commandLine) => {
        logger.debug(`FFmpeg normalization started: ${commandLine}`);
      })
      .on('end', () => {
        logger.info(`Media normalized to: ${outputPath}`);
        resolve(outputPath);
      })
      .on('error', (err) => {
        logger.error('FFmpeg normalization error:', err);
        reject(err);
      })
      .run();
  });
};

/**
 * Extract GPS coordinates from image file
 * @param {string} inputPath - Path to image file
 * @returns {Promise<Object|null>} GPS coordinates {latitude, longitude} or null if not found
 */
export const extractGPSFromImage = async (inputPath) => {
  try {
    // Check if file exists
    if (!fs.existsSync(inputPath)) {
      logger.warn(`File not found for GPS extraction: ${inputPath}`);
      return null;
    }

    // Extract EXIF data including GPS
    const exifData = await exifr.parse(inputPath, {
      gps: true,
      pick: ['latitude', 'longitude'],
    });

    if (exifData && exifData.latitude !== undefined && exifData.longitude !== undefined) {
      logger.info(`GPS coordinates extracted: ${exifData.latitude}, ${exifData.longitude}`);
      return {
        latitude: exifData.latitude,
        longitude: exifData.longitude,
      };
    }

    logger.debug(`No GPS coordinates found in image: ${inputPath}`);
    return null;
  } catch (error) {
    logger.warn(`Failed to extract GPS coordinates from ${inputPath}: ${error.message}`);
    return null;
  }
};

export default {
  extractFrames,
  extractAudio,
  getMediaMetadata,
  normalizeMedia,
  extractGPSFromImage,
};

