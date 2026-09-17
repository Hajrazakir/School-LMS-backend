const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema(
  {
    school: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    parent: { type: mongoose.Schema.Types.ObjectId, ref: 'Parent', required: true },
    teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', required: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true }, // the child linking them

    lastMessageAt: { type: Date },
    lastMessagePreview: { type: String },

    isRestricted: { type: Boolean, default: false }, // admin can block a conversation (FR-13.5)
  },
  { timestamps: true }
);

// A parent may only have one conversation per (teacher, student) pair -
// enforces the "assigned teacher only" restriction at the data layer too (FR-13.2).
conversationSchema.index({ parent: 1, teacher: 1, student: 1 }, { unique: true });

module.exports = mongoose.model('Conversation', conversationSchema);
