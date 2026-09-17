const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    school: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true, index: true },

    rollNumber: { type: String, required: true, trim: true },
    class: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: true, index: true },
    section: { type: String, required: true },

    dateOfBirth: { type: Date },
    gender: { type: String, enum: ['male', 'female', 'other'] },
    admissionDate: { type: Date, default: Date.now },

    guardians: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Parent' }], // linked parent profiles (FR-12.1)

    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

studentSchema.index({ school: 1, class: 1, section: 1 });
studentSchema.index({ school: 1, rollNumber: 1 }, { unique: true });

module.exports = mongoose.model('Student', studentSchema);
