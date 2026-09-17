const mongoose = require('mongoose');

const assignmentSchema = new mongoose.Schema(
  {
    school: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', required: true },
    class: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: true },
    section: { type: String, required: true },
    subject: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },

    title: { type: String, required: true },
    description: { type: String },
    attachmentUrls: [{ type: String }],
    deadline: { type: Date, required: true },

    submissions: [
      {
        student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
        fileUrl: { type: String, required: true },
        submittedAt: { type: Date, default: Date.now },
        isLate: { type: Boolean, default: false },
        marks: { type: Number },
        feedback: { type: String },
        gradedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher' },
        gradedAt: { type: Date },
      },
    ],
  },
  { timestamps: true }
);

assignmentSchema.index({ school: 1, class: 1, section: 1 });
assignmentSchema.index({ 'submissions.student': 1 });

module.exports = mongoose.model('Assignment', assignmentSchema);
