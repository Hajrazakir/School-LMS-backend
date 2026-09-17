const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const { AuditLog } = require('../models');

/** Read-only view of everything recorded by audit.service.js (FR-20.x). */
const listAuditLogs = asyncHandler(async (req, res) => {
  const filter = { school: req.user.school };
  if (req.query.user) filter.user = req.query.user;
  if (req.query.module) filter.module = req.query.module;
  if (req.query.action) filter.action = req.query.action;
  if (req.query.from || req.query.to) {
    filter.createdAt = {};
    if (req.query.from) filter.createdAt.$gte = new Date(req.query.from);
    if (req.query.to) filter.createdAt.$lte = new Date(req.query.to);
  }

  const logs = await AuditLog.find(filter).populate('user').sort({ createdAt: -1 }).limit(500);
  return res.status(200).json(new ApiResponse(200, { logs }, 'Audit logs fetched'));
});

module.exports = { listAuditLogs };