const nodemailer = require('nodemailer');
const { env } = require('../config/env');
const logger = require('../utils/logger');

let transporter = null;

function getTransporter() {
  if (!env.smtp.host) {
    return null; // Not configured yet - caller should handle gracefully.
  }
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.smtp.host,
      port: env.smtp.port,
      secure: env.smtp.port === 465,
      auth: env.smtp.user ? { user: env.smtp.user, pass: env.smtp.pass } : undefined,
    });
  }
  return transporter;
}

/**
 * Sends an email. In development, if SMTP isn't configured, logs the
 * content instead of throwing - so auth flows are still testable locally
 * without real SMTP credentials.
 */
async function sendEmail({ to, subject, html, text }) {
  const t = getTransporter();

  if (!t) {
    logger.warn(`SMTP not configured - email NOT sent. Would have sent to ${to}: ${subject}`);
    if (!env.isProd) {
      logger.debug('Email body (dev only)', { html, text });
    }
    return { simulated: true };
  }

  return t.sendMail({
    from: env.smtp.from,
    to,
    subject,
    html,
    text,
  });
}

async function sendVerificationEmail(user, rawToken) {
  const link = `${env.clientUrl}/verify-email?token=${rawToken}&uid=${user._id}`;
  return sendEmail({
    to: user.email,
    subject: 'Verify your School LMS account',
    html: `<p>Hi ${user.fullName},</p><p>Please verify your account by clicking the link below:</p><p><a href="${link}">${link}</a></p><p>This link expires in 24 hours.</p>`,
  });
}

async function sendPasswordResetEmail(user, rawToken) {
  const link = `${env.clientUrl}/reset-password?token=${rawToken}&uid=${user._id}`;
  return sendEmail({
    to: user.email,
    subject: 'Reset your School LMS password',
    html: `<p>Hi ${user.fullName},</p><p>Click below to reset your password. This link is valid for 30 minutes and can be used only once:</p><p><a href="${link}">${link}</a></p><p>If you didn't request this, you can safely ignore this email.</p>`,
  });
}

module.exports = { sendEmail, sendVerificationEmail, sendPasswordResetEmail };
