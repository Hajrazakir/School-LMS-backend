const mongoose = require('mongoose');

const resultSchema = new mongoose.Schema(
  {
    school: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    examination: { type: mongoose.Schema.Types.ObjectId, ref: 'Examination', required: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },

    subjectMarks: [
      {
        subject: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
        obtainedMarks: { type: Number, required: true },
        totalMarks: { type: Number, required: true },
        grade: { type: String },
        remarks: { type: String },
        enteredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher' },
        approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // FR-7.2: admin approval before publication
        approvedAt: { type: Date },
      },
    ],

    // Computed on approval (FR-7.3)
    totalObtained: { type: Number },
    totalMax: { type: Number },
    percentage: { type: Number },
    gpa: { type: Number },
    overallGrade: { type: String },
    passFail: { type: String, enum: ['pass', 'fail'] },
    classPosition: { type: Number },

    attendancePercentageAtExam: { type: Number },

    status: {
      type: String,
      enum: ['draft', 'pending_approval', 'published'],
      default: 'draft',
    },
  },
  { timestamps: true }
);

resultSchema.index({ examination: 1, student: 1 }, { unique: true });

module.exports = mongoose.model('Result', resultSchema);
