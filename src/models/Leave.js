const mongoose = require('mongoose');

const leaveSchema = new mongoose.Schema(
  {
    school: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    applicant: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    applicantRole: { type: String, enum: ['student', 'teacher'], required: true },

    leaveType: { type: String, required: true }, // e.g. "sick", "casual"
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    reason: { type: String, required: true },
    supportingDocumentUrl: { type: String },

    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
      index: true,
    },
    decidedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    decidedAt: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Leave', leaveSchema);
