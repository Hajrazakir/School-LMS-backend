const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const { env } = require('../config/env');

/**
 * User = identity + authentication record shared by ALL six roles
 * (Super Admin, School Admin, Accountant, Teacher, Student, Parent).
 * Role-specific academic/financial data lives in separate profile
 * collections (Student, Teacher, Parent, Accountant) that reference
 * this document via `user`. This mirrors the SRS's entity list
 * (Section 6.1) where User is distinct from Student/Teacher/Parent.
 */
const userSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true, maxlength: 120 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Invalid email address'],
    },
    phone: { type: String, trim: true },
    passwordHash: { type: String, required: true, select: false },

    role: {
      type: String,
      required: true,
      enum: ['super_admin', 'school_admin', 'accountant', 'teacher', 'student', 'parent'],
      index: true,
    },

    // Multi-school ready: every non-super-admin user belongs to exactly one school.
    school: { type: mongoose.Schema.Types.ObjectId, ref: 'School', index: true },

    profileImage: {
      url: { type: String },
      publicId: { type: String }, // Cloudinary public_id, needed to replace/delete the asset
    },

    isEmailVerified: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true }, // admin activate/deactivate (FR-1.6)

    // --- Password reset / email verification (FR-1.4, FR-1.5) ---
    emailVerificationTokenHash: { type: String, select: false },
    emailVerificationExpires: { type: Date, select: false },
    passwordResetTokenHash: { type: String, select: false },
    passwordResetExpires: { type: Date, select: false },
    passwordResetUsed: { type: Boolean, default: false, select: false },

    // --- Session/refresh-token invalidation (FR-1.9) ---
    // Bumping tokenVersion instantly invalidates every previously issued
    // access & refresh token for this user (used on logout-all, deactivation,
    // and password change).
    tokenVersion: { type: Number, default: 0 },

    // --- Account lockout after repeated failed logins (NFR-7) ---
    failedLoginAttempts: { type: Number, default: 0, select: false },
    lockUntil: { type: Date, select: false },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // which admin provisioned this account
  },
  { timestamps: true }
);

userSchema.index({ school: 1, role: 1 });

// --- Password hashing (FR-1.3) ---
userSchema.methods.setPassword = async function setPassword(plainPassword) {
  this.passwordHash = await bcrypt.hash(plainPassword, env.bcryptSaltRounds);
};

userSchema.methods.comparePassword = function comparePassword(plainPassword) {
  return bcrypt.compare(plainPassword, this.passwordHash);
};

userSchema.methods.isLocked = function isLocked() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
};

// Never leak sensitive fields even if a route accidentally serializes the doc.
userSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret.passwordHash;
    delete ret.emailVerificationTokenHash;
    delete ret.passwordResetTokenHash;
    delete ret.failedLoginAttempts;
    delete ret.lockUntil;
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model('User', userSchema);
