const mongoose = require('mongoose');

const classSchema = new mongoose.Schema(
  {
    school: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    name: { type: String, required: true, trim: true }, // e.g. "Grade 8"
    sections: [{ type: String, trim: true }], // e.g. ["A", "B"]
    academicSession: { type: String },
    classTeacher: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher' },
  },
  { timestamps: true }
);

classSchema.index({ school: 1, name: 1, academicSession: 1 }, { unique: true });

module.exports = mongoose.model('Class', classSchema);
