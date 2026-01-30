/**
 * Report Service
 * Handles generation of PDF, JSON, and CSV export formats
 */

import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Scan from '../scans/scan.model.js';
import logger from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Generate PDF report for a scan
 * @param {Object} scan - Scan document
 * @param {string} outputPath - Path to save PDF
 * @returns {Promise<string>} Path to generated PDF
 */
export const generatePDFReport = async (scan, outputPath) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });

      // Ensure output directory exists
      const outputDir = path.dirname(outputPath);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      const stream = fs.createWriteStream(outputPath);
      doc.pipe(stream);

      // Header
      doc.fontSize(20).text('Deepfake Detection Report', { align: 'center' });
      doc.moveDown();
      doc.fontSize(12).text(`Scan ID: ${scan.scanId}`, { align: 'center' });
      doc.moveDown(2);

      // Scan Information
      doc.fontSize(16).text('Scan Information', { underline: true });
      doc.moveDown();
      doc.fontSize(10).text(`File Name: ${scan.fileName || 'N/A'}`);
      doc.text(`Media Type: ${scan.mediaType || 'N/A'}`);
      doc.text(`File Size: ${(scan.fileSize / 1024 / 1024).toFixed(2)} MB`);
      doc.text(`File Hash: ${scan.fileHash || 'N/A'}`);
      doc.text(`Upload Date: ${scan.createdAt ? new Date(scan.createdAt).toLocaleString() : 'N/A'}`);
      doc.text(`Operative ID: ${scan.operativeId || 'N/A'}`);
      doc.moveDown();

      // Result Information
      if (scan.result) {
        doc.fontSize(16).text('Detection Results', { underline: true });
        doc.moveDown();
        doc.fontSize(14).text(`Verdict: ${scan.result.verdict || 'PENDING'}`, {
          align: 'left',
        });
        doc.text(`Status: ${scan.status || 'PENDING'}`);
        doc.moveDown();

        if (scan.result.confidence !== undefined) {
          doc.fontSize(12).text(`Confidence: ${scan.result.confidence}%`);
        }
        if (scan.result.riskScore !== undefined) {
          doc.fontSize(12).text(`Risk Score: ${scan.result.riskScore}%`);
        }
        doc.moveDown();

        // Metadata
        if (scan.result.metadata) {
          doc.fontSize(14).text('Detection Metrics', { underline: true });
          doc.moveDown();
          const metadata = scan.result.metadata;
          if (metadata.facialMatch !== undefined) {
            doc.text(`Facial Match: ${metadata.facialMatch}%`);
          }
          if (metadata.audioMatch !== undefined) {
            doc.text(`Audio Match: ${metadata.audioMatch}%`);
          }
          if (metadata.ganFingerprint !== undefined) {
            doc.text(`GAN Fingerprint: ${metadata.ganFingerprint}%`);
          }
          if (metadata.temporalConsistency !== undefined) {
            doc.text(`Temporal Consistency: ${metadata.temporalConsistency}%`);
          }
          doc.moveDown();
        }

        // Explanations
        if (scan.result.explanations && scan.result.explanations.length > 0) {
          doc.fontSize(14).text('Analysis Explanations', { underline: true });
          doc.moveDown();
          scan.result.explanations.forEach((explanation, index) => {
            doc.fontSize(10).text(`${index + 1}. ${explanation}`, {
              indent: 20,
            });
            doc.moveDown(0.5);
          });
        }
      }

      // GPS Coordinates
      if (scan.gpsCoordinates) {
        doc.moveDown();
        doc.fontSize(14).text('Location Information', { underline: true });
        doc.moveDown();
        doc.text(`Latitude: ${scan.gpsCoordinates.latitude}`);
        doc.text(`Longitude: ${scan.gpsCoordinates.longitude}`);
      }

      // Tags
      if (scan.tags && scan.tags.length > 0) {
        doc.moveDown();
        doc.fontSize(14).text('Tags', { underline: true });
        doc.moveDown();
        doc.text(scan.tags.join(', '));
      }

      // Footer
      doc.moveDown(3);
      doc.fontSize(8)
        .fillColor('gray')
        .text(
          `Report generated on ${new Date().toLocaleString()}`,
          { align: 'center' }
        );

      doc.end();

      stream.on('finish', () => {
        logger.info(`PDF report generated: ${outputPath}`);
        resolve(outputPath);
      });

      stream.on('error', (error) => {
        logger.error('PDF generation error:', error);
        reject(error);
      });
    } catch (error) {
      logger.error('PDF report generation error:', error);
      reject(error);
    }
  });
};

/**
 * Generate JSON export for a scan
 * @param {Object} scan - Scan document
 * @returns {Object} Formatted JSON data
 */
export const generateJSONExport = (scan) => {
  return {
    scanId: scan.scanId,
    fileName: scan.fileName,
    mediaType: scan.mediaType,
    fileSize: scan.fileSize,
    fileHash: scan.fileHash,
    mimeType: scan.mimeType,
    status: scan.status,
    operativeId: scan.operativeId,
    uploadedAt: scan.createdAt ? new Date(scan.createdAt).toISOString() : null,
    result: scan.result || null,
    gpsCoordinates: scan.gpsCoordinates || null,
    tags: scan.tags || [],
    metadata: {
      createdAt: scan.createdAt ? new Date(scan.createdAt).toISOString() : null,
      updatedAt: scan.updatedAt ? new Date(scan.updatedAt).toISOString() : null,
    },
  };
};

/**
 * Generate CSV export for multiple scans
 * @param {Array<Object>} scans - Array of scan documents
 * @returns {string} CSV string
 */
export const generateCSVExport = (scans) => {
  if (!scans || scans.length === 0) {
    return 'No scans to export\n';
  }

  // CSV Headers
  const headers = [
    'Scan ID',
    'File Name',
    'Media Type',
    'Status',
    'Verdict',
    'Confidence',
    'Risk Score',
    'File Hash',
    'Operative ID',
    'Upload Date',
    'Tags',
    'GPS Latitude',
    'GPS Longitude',
  ];

  // Build CSV rows
  const rows = scans.map((scan) => {
    const result = scan.result || {};
    return [
      scan.scanId || '',
      `"${(scan.fileName || '').replace(/"/g, '""')}"`,
      scan.mediaType || '',
      scan.status || '',
      result.verdict || '',
      result.confidence || '',
      result.riskScore || '',
      scan.fileHash || '',
      scan.operativeId || '',
      scan.createdAt ? new Date(scan.createdAt).toISOString() : '',
      (scan.tags || []).join('; '),
      scan.gpsCoordinates?.latitude || '',
      scan.gpsCoordinates?.longitude || '',
    ];
  });

  // Combine headers and rows
  const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');

  return csvContent;
};

/**
 * Get scan by ID for export
 * @param {string} scanId - Scan ID
 * @param {string} userId - User ID (for access control)
 * @param {string} userRole - User role
 * @returns {Promise<Object>} Scan document
 */
export const getScanForExport = async (scanId, userId, userRole) => {
  try {
    const query = { scanId };

    // Non-admins can only export their own scans
    if (userRole !== 'admin') {
      query.userId = userId;
    }

    const scan = await Scan.findOne(query).lean();
    if (!scan) {
      throw new Error('Scan not found or access denied');
    }

    return scan;
  } catch (error) {
    logger.error('Get scan for export error:', error);
    throw error;
  }
};

export default {
  generatePDFReport,
  generateJSONExport,
  generateCSVExport,
  getScanForExport,
};
