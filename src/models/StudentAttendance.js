const mongoose = require('mongoose');

const studentAttendanceSchema = new mongoose.Schema(
  {
    school: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
    class: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: true },
    section: { type: String, required: true },
    subject: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
    teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', required: true },

    date: { type: Date, required: true },
    status: {
      type: String,
      required: true,
      enum: ['present', 'absent', 'late', 'on_leave', 'half_day'],
    },
    remarks: { type: String },

    // Correction audit trail (FR-5.6) - retained inline for quick lookup;
    // full detail also written to AuditLog.
    editHistory: [
      {
        previousStatus: String,
        editedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        editedAt: { type: Date, default: Date.now },
        reason: String,
      },
    ],
  },
  { timestamps: true }
);

// One attendance entry per student/subject/date (FR-5.1)
studentAttendanceSchema.index(
  { student: 1, subject: 1, date: 1 },
  { unique: true }
);
studentAttendanceSchema.index({ school: 1, class: 1, section: 1, date: 1 });

module.exports = mongoose.model('StudentAttendance', studentAttendanceSchema);
