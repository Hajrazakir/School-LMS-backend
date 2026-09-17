const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    school: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
    challan: { type: mongoose.Schema.Types.ObjectId, ref: 'FeeChallan', required: true },

    amount: { type: Number, required: true },
    method: {
      type: String,
      required: true,
      enum: ['jazzcash', 'easypaisa', 'raast', 'card', 'manual_bank_deposit', 'cash'],
    },

    // Duplicate-transaction prevention (FR-9.7) - unique + sparse so
    // cash/manual entries without a gateway transactionId don't collide.
    transactionId: { type: String, unique: true, sparse: true },
    bankName: { type: String },
    receiptImageUrl: { type: String }, // manual bank deposit proof (FR-9.4)

    status: {
      type: String,
      required: true,
      enum: ['pending', 'successful', 'failed', 'cancelled', 'refunded', 'under_verification'],
      default: 'pending',
      index: true,
    },

    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // accountant who verified manual deposit
    verificationDate: { type: Date },

    // Raw gateway callback payload retained for audit/dispute resolution.
    gatewayResponseRaw: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
);

paymentSchema.index({ school: 1, status: 1 });
paymentSchema.index({ student: 1, createdAt: -1 });

module.exports = mongoose.model('Payment', paymentSchema);
