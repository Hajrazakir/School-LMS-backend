const mongoose = require('mongoose');

const examinationSchema = new mongoose.Schema(
  {
    school: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    title: { type: String, required: true }, // e.g. "Mid-Term 2026"
    class: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: true },
    academicSession: { type: String },

    subjects: [
      {
        subject: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
        date: { type: Date, required: true },
        totalMarks: { type: Number, required: true },
        passingMarks: { type: Number, required: true },
      },
    ],

    status: {
      type: String,
      enum: ['scheduled', 'ongoing', 'completed', 'published'],
      default: 'scheduled',
    },
  },
  { timestamps: true }
);

examinationSchema.index({ school: 1, class: 1, academicSession: 1 });

module.exports = mongoose.model('Examination', examinationSchema);
