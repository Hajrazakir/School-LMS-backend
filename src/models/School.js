const mongoose = require('mongoose');

/**
 * One document per school (multi-tenant ready, Section 2.1/2.3).
 * Holds identity + all admin-configurable policy knobs referenced across
 * the SRS (attendance rules, fee rules, salary-deduction rules, grading,
 * currency, timezone, integration settings).
 */
const schoolSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    logoUrl: { type: String },
    address: { type: String },
    phone: { type: String },
    email: { type: String },

    currentAcademicSession: { type: String }, // e.g. "2026-2027"

    policies: {
      workingDays: { type: [String], default: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] },
      standardWorkingHours: { type: Number, default: 8 },
      gracePeriodMinutes: { type: Number, default: 10 },

      attendance: {
        lateThresholdMinutes: { type: Number, default: 15 },
      },

      salaryDeduction: {
        allowedAbsencesPerMonth: { type: Number, default: 2 },
        perDayDeductionRate: { type: Number, default: 0 }, // fraction of daily salary or flat amount
        lateArrivalPenalty: { type: Number, default: 0 },
        halfDayDeduction: { type: Number, default: 0 },
      },

      fee: {
        lateFineFlat: { type: Number, default: 0 },
        lateFinePercent: { type: Number, default: 0 },
      },

      grading: {
        scheme: { type: String, default: 'percentage' }, // 'percentage' | 'gpa'
        gradeBands: [
          {
            grade: String, // e.g. 'A+'
            minPercent: Number,
            maxPercent: Number,
            gpa: Number,
          },
        ],
      },

      currency: { type: String, default: 'PKR' },
      timezone: { type: String, default: 'Asia/Karachi' },
    },

    // Integration config. Secrets themselves are never stored here in
    // plaintext - only references/flags; actual secrets live in the
    // process environment or an encrypted secrets store (FR-19.3).
    integrations: {
      biometricDeviceConfigured: { type: Boolean, default: false },
      biometricDeviceLabel: { type: String },
      paymentGatewaysEnabled: {
        jazzcash: { type: Boolean, default: false },
        easypaisa: { type: Boolean, default: false },
        raast: { type: Boolean, default: false },
        card: { type: Boolean, default: false },
      },
      emailConfigured: { type: Boolean, default: false },
    },

    auditLogRetentionDays: { type: Number, default: 365 }, // NFR-20
  },
  { timestamps: true }
);

module.exports = mongoose.model('School', schoolSchema);
