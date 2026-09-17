const mongoose = require('mongoose');

const accountantSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    school: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true, index: true },

    employeeId: { type: String, trim: true },

    // Fine-grained permission checks (FR-10.4): not every accountant is
    // allowed to apply discounts / issue refunds.
    permissions: {
      canApplyDiscount: { type: Boolean, default: false },
      canIssueRefund: { type: Boolean, default: false },
      canProcessSalary: { type: Boolean, default: true },
    },

    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Accountant', accountantSchema);
