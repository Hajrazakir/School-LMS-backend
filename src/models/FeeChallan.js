const mongoose = require('mongoose');

const feeChallanSchema = new mongoose.Schema(
  {
    school: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
    feeStructure: { type: mongoose.Schema.Types.ObjectId, ref: 'FeeStructure', required: true },

    challanNumber: { type: String, required: true, unique: true },
    billingMonth: { type: String, required: true }, // "2026-09"
    dueDate: { type: Date, required: true },

    breakdown: {
      admission: { type: Number, default: 0 },
      tuition: { type: Number, default: 0 },
      examination: { type: Number, default: 0 },
      transport: { type: Number, default: 0 },
      laboratory: { type: Number, default: 0 },
      library: { type: Number, default: 0 },
      lateFine: { type: Number, default: 0 },
      discount: { type: Number, default: 0 },
      scholarship: { type: Number, default: 0 },
    },

    totalAmount: { type: Number, required: true },
    paidAmount: { type: Number, default: 0 },

    status: {
      type: String,
      enum: ['unpaid', 'partially_paid', 'paid', 'overdue', 'pending_verification', 'waived'],
      default: 'unpaid',
      index: true,
    },
  },
  { timestamps: true }
);

feeChallanSchema.index({ school: 1, student: 1, billingMonth: 1 }, { unique: true });
feeChallanSchema.index({ school: 1, status: 1 });

module.exports = mongoose.model('FeeChallan', feeChallanSchema);
