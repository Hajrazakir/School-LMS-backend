const mongoose = require('mongoose');

const teacherSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    school: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true, index: true },

    employeeId: { type: String, required: true, trim: true },
    biometricEmployeeId: { type: String, index: true, sparse: true, unique: true },

    // --- Personal details (matches the accountant registration form) ---
    gender: { type: String, enum: ['Male', 'Female', 'Other'] },
    dob: { type: Date },
    cnic: { type: String, trim: true },
    bloodGroup: { type: String },
    address: { type: String },
    city: { type: String },
    emergencyContact: { type: String },

    // --- Academic / employment details ---
    department: { type: String },
    designation: { type: String },
    qualification: { type: String },
    specialization: { type: String },
    experienceYears: { type: String },
    employmentType: { type: String, enum: ['Full Time', 'Part Time', 'Contract'], default: 'Full Time' },
    dateOfJoining: { type: Date, default: Date.now },

    assignedClasses: [{ type: String }],
    assignedSections: [{ type: String }],
    subjects: [{ type: String }],
    classTeacherOf: { type: String },

    // --- Salary ---
    salary: {
      basic: { type: Number, default: 0 },
      allowances: { type: Number, default: 0 },
      bonus: { type: Number, default: 0 },
      tax: { type: Number, default: 0 },
      attendanceDeduction: { type: Number, default: 0 },
      netSalary: { type: Number, default: 0 },
      bankAccount: { type: String },
    },

    // --- Attendance policy fields (used later by biometric module) ---
    checkInTime: { type: String },
    checkOutTime: { type: String },

    documents: {
      resume: { type: Boolean, default: false },
      degree: { type: Boolean, default: false },
      experienceCert: { type: Boolean, default: false },
      cnicCopy: { type: Boolean, default: false },
    },

    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

teacherSchema.index({ school: 1, employeeId: 1 }, { unique: true });

module.exports = mongoose.model('Teacher', teacherSchema);

