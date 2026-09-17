const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    school: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // null for system-generated

    type: {
      type: String,
      required: true,
      enum: [
        'exam_scheduled', 'result_published', 'holiday', 'attendance_absent', 'attendance_late',
        'fee_due', 'fee_overdue', 'fee_paid', 'salary_processed', 'leave_decision',
        'assignment_created', 'new_message', 'school_event', 'announcement',
      ],
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    relatedLink: { type: String }, // deep link to the related page/record (FR-14.4)

    isRead: { type: Boolean, default: false, index: true },
    isHighPriority: { type: Boolean, default: false }, // triggers email too (FR-14.2)
    emailSent: { type: Boolean, default: false },
  },
  { timestamps: true }
);

notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
