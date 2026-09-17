const mongoose = require('mongoose');

const parentSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    school: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true, index: true },

    relationship: { type: String, enum: ['father', 'mother', 'guardian'], default: 'guardian' },

    // Multi-child linking (FR-12.1)
    children: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Student' }],

    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Parent', parentSchema);
