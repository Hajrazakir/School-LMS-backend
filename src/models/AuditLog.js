const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    school: { type: mongoose.Schema.Types.ObjectId, ref: 'School', index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    role: { type: String },

    action: { type: String, required: true }, // e.g. "LOGIN_FAILED", "FEE_PAYMENT_VERIFIED"
    module: { type: String, required: true }, // e.g. "auth", "fees", "attendance"

    ipAddress: { type: String },
    device: { type: String },

    oldValue: { type: mongoose.Schema.Types.Mixed },
    newValue: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
);

auditLogSchema.index({ school: 1, module: 1, createdAt: -1 });
auditLogSchema.index({ user: 1, createdAt: -1 });

// TTL-style cleanup is handled by a scheduled job using school.auditLogRetentionDays
// rather than a fixed TTL index, since retention is admin-configurable per school (NFR-20).

module.exports = mongoose.model('AuditLog', auditLogSchema);
