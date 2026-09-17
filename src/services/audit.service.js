const { AuditLog } = require('../models');
const logger = require('../utils/logger');

/**
 * Writes an audit trail entry. Never throws - a logging failure should
 * never break the primary request. Call this for every security-relevant
 * or financially significant action (FR-20.1): logins, attendance edits,
 * marks updates, fee collection, payment verification, salary
 * approval/transfer, user deletion, chat restrictions, etc.
 */
async function recordAudit({ req, school, user, role, action, module: moduleName, oldValue, newValue }) {
  try {
    await AuditLog.create({
      school,
      user,
      role,
      action,
      module: moduleName,
      ipAddress: req?.ip,
      device: req?.headers?.['user-agent'],
      oldValue,
      newValue,
    });
  } catch (err) {
    logger.error('Failed to write audit log', err);
  }
}

module.exports = { recordAudit };
