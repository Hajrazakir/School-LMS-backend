const mongoose = require('mongoose');

const salarySchema = new mongoose.Schema(
  {
    school: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', required: true },
    month: { type: String, required: true }, // "2026-09"

    basic: { type: Number, required: true, default: 0 },
    allowances: { type: Number, default: 0 },
    bonus: { type: Number, default: 0 },
    overtime: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    loanDeduction: { type: Number, default: 0 },
    attendanceDeduction: { type: Number, default: 0 }, // derived from TeacherAttendance (FR-11.2)
    otherDeductions: { type: Number, default: 0 },

    netSalary: { type: Number, required: true }, // FR-11.1 formula, computed server-side

    status: {
      type: String,
      enum: ['draft', 'pending_approval', 'approved', 'processing', 'paid', 'failed'],
      default: 'draft',
      index: true,
    },

    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approvedAt: { type: Date },

    disbursement: {
      method: { type: String, enum: ['bank_transfer', 'jazzcash', 'easypaisa', 'raast'] },
      transactionReference: { type: String },
      processedAt: { type: Date },
    },
  },
  { timestamps: true }
);

salarySchema.index({ teacher: 1, month: 1 }, { unique: true });

module.exports = mongoose.model('Salary', salarySchema);
