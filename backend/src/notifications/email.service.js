/**
 * Email Service
 * Handles email notifications using nodemailer
 */

import nodemailer from 'nodemailer';
import config from '../config/env.js';
import logger from '../utils/logger.js';

let transporter = null;

/**
 * Initialize email transporter
 * @returns {Promise<nodemailer.Transporter>} Email transporter
 */
export const initializeEmailService = async () => {
  try {
    // Check if email is configured
    if (!config.email?.smtp?.host) {
      logger.warn('[EMAIL] SMTP not configured, email notifications disabled');
      return null;
    }

    transporter = nodemailer.createTransport({
      host: config.email.smtp.host,
      port: config.email.smtp.port || 587,
      secure: config.email.smtp.secure || false,
      auth: config.email.smtp.user
        ? {
            user: config.email.smtp.user,
            pass: config.email.smtp.password,
          }
        : undefined,
    });

    // Verify connection
    await transporter.verify();
    logger.info('[EMAIL] Email service initialized');
    return transporter;
  } catch (error) {
    logger.warn('[EMAIL] Failed to initialize email service:', error.message);
    transporter = null;
    return null;
  }
};

/**
 * Send email notification
 * @param {Object} user - User object
 * @param {Object} notification - Notification object
 * @returns {Promise<void>}
 */
export const sendEmailNotification = async (user, notification) => {
  if (!transporter) {
    logger.warn('[EMAIL] Email service not available, skipping email notification');
    return;
  }

  try {
    const subject = `[SENTINEL-X] ${notification.title}`;
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #1a1a1a; color: #fff; padding: 20px; text-align: center; }
            .content { background-color: #f9f9f9; padding: 20px; margin: 20px 0; }
            .footer { text-align: center; color: #666; font-size: 12px; padding: 20px; }
            .priority-critical { border-left: 4px solid #ef4444; }
            .priority-high { border-left: 4px solid #f59e0b; }
            .priority-medium { border-left: 4px solid #3b82f6; }
            .priority-low { border-left: 4px solid #10b981; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>SENTINEL-X</h1>
              <p>Deepfake Detection System</p>
            </div>
            <div class="content priority-${notification.priority || 'medium'}">
              <h2>${notification.title}</h2>
              <p>${notification.message}</p>
              ${notification.data ? `<pre style="background: #fff; padding: 10px; border-radius: 4px; overflow-x: auto;">${JSON.stringify(notification.data, null, 2)}</pre>` : ''}
            </div>
            <div class="footer">
              <p>This is an automated notification from SENTINEL-X</p>
              <p>You can manage your notification preferences in your account settings.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const text = `
SENTINEL-X - ${notification.title}

${notification.message}

${notification.data ? JSON.stringify(notification.data, null, 2) : ''}

---
This is an automated notification from SENTINEL-X
You can manage your notification preferences in your account settings.
    `;

    await transporter.sendMail({
      from: config.email.from || 'noreply@sentinel-x.com',
      to: user.email,
      subject,
      text,
      html,
    });

    logger.info(`[EMAIL] Notification email sent to ${user.email}`);
  } catch (error) {
    logger.error('[EMAIL] Failed to send email notification:', error);
    throw error;
  }
};

export default {
  initializeEmailService,
  sendEmailNotification,
};
