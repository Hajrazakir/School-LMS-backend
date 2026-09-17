const mongoose = require('mongoose');

const timetableSchema = new mongoose.Schema(
  {
    school: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    class: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: true },
    section: { type: String, required: true },
    subject: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
    teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', required: true },
    room: { type: String },

    day: {
      type: String,
      required: true,
      enum: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    },
    startTime: { type: String, required: true }, // "HH:mm" 24h
    endTime: { type: String, required: true },
  },
  { timestamps: true }
);

// Conflict prevention (FR-15.2) is enforced in the service layer via an
// overlap query (teacher/class/room + day + time-range intersection),
// since Mongo can't express "no overlapping range" purely with a unique index.
timetableSchema.index({ school: 1, day: 1, teacher: 1 });
timetableSchema.index({ school: 1, day: 1, class: 1, section: 1 });
timetableSchema.index({ school: 1, day: 1, room: 1 });

module.exports = mongoose.model('Timetable', timetableSchema);
