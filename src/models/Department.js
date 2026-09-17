const mongoose = require('mongoose');

const departmentSchema = new mongoose.Schema(
  {
    school: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    name: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

departmentSchema.index({ school: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Department', departmentSchema);
