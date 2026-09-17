const mongoose = require('mongoose');

const teacherAttendanceSchema = new mongoose.Schema(
  {
    school: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', required: true },

    date: { type: Date, required: true },

    // Device-sourced fields (FR-6.1, FR-6.2)
    biometricDeviceId: { type: String },
    checkInTime: { type: Date },
    checkOutTime: { type: Date },

    status: {
      type: String,
      required: true,
      enum: ['present', 'absent', 'late', 'half_day', 'on_leave'],
    },

    // Derived metrics (FR-6.3, FR-6.4)
    workingHours: { type: Number, default: 0 },
    overtimeHours: { type: Number, default: 0 },

    // Distinguishes real device events from admin fallback entries (FR-6.7,
    // Section 2.5 constraint: never disguise a manual entry as device data).
    source: { type: String, enum: ['device', 'manual'], required: true },
    enteredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // set when source === 'manual'

    linkedLeave: { type: mongoose.Schema.Types.ObjectId, ref: 'Leave' }, // excludes this day from unauthorized-absence count (FR-17.3)
  },
  { timestamps: true }
);

teacherAttendanceSchema.index({ teacher: 1, date: 1 }, { unique: true });
teacherAttendanceSchema.index({ school: 1, date: 1 });

module.exports = mongoose.model('TeacherAttendance', teacherAttendanceSchema);
