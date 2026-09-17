const mongoose = require('mongoose');

const feeStructureSchema = new mongoose.Schema(
  {
    school: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    class: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: true },
    academicSession: { type: String },

    components: {
      admission: { type: Number, default: 0 },
      tuition: { type: Number, default: 0 },
      examination: { type: Number, default: 0 },
      transport: { type: Number, default: 0 },
      laboratory: { type: Number, default: 0 },
      library: { type: Number, default: 0 },
    },

    lateFine: {
      flatAmount: { type: Number, default: 0 },
      percent: { type: Number, default: 0 },
      gracePeriodDays: { type: Number, default: 5 },
    },

    discounts: [
      {
        label: { type: String }, // e.g. "Sibling discount"
        type: { type: String, enum: ['flat', 'percent'] },
        value: { type: Number },
      },
    ],

    scholarships: [
      {
        label: { type: String },
        type: { type: String, enum: ['flat', 'percent'] },
        value: { type: Number },
      },
    ],

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

feeStructureSchema.index({ school: 1, class: 1, academicSession: 1 }, { unique: true });

module.exports = mongoose.model('FeeStructure', feeStructureSchema);
