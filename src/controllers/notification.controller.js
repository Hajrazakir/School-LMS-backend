const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const { Notification, User } = require('../models');

const listMyNotifications = asyncHandler(async (req, res) => {
  const filter = { recipient: req.user._id };
  if (req.query.isRead !== undefined) filter.isRead = req.query.isRead === 'true';

  const notifications = await Notification.find(filter).sort({ createdAt: -1 }).limit(100);
  return res.status(200).json(new ApiResponse(200, { notifications }, 'Notifications fetched'));
});

const getUnreadCount = asyncHandler(async (req, res) => {
  const count = await Notification.countDocuments({ recipient: req.user._id, isRead: false });
  return res.status(200).json(new ApiResponse(200, { count }, 'Unread count fetched'));
});

const markRead = asyncHandler(async (req, res) => {
  const notification = await Notification.findOne({ _id: req.params.id, recipient: req.user._id });
  if (!notification) throw ApiError.notFound('Notification not found');
  notification.isRead = true;
  await notification.save();
  return res.status(200).json(new ApiResponse(200, { notification }, 'Marked as read'));
});

const markAllRead = asyncHandler(async (req, res) => {
  await Notification.updateMany({ recipient: req.user._id, isRead: false }, { $set: { isRead: true } });
  return res.status(200).json(new ApiResponse(200, null, 'All notifications marked as read'));
});

/** Admin sends an announcement to specific users or broadcasts to a whole role (FR-14.x). */
const sendNotification = asyncHandler(async (req, res) => {
  const { recipients, role, type, title, message, relatedLink, isHighPriority } = req.body;
  const school = req.user.school;

  let recipientIds = recipients;
  if (!recipientIds || !recipientIds.length) {
    const users = await User.find({ school, role }).select('_id');
    recipientIds = users.map((u) => u._id);
  }
  if (!recipientIds.length) throw ApiError.badRequest('No matching recipients were found');

  const docs = recipientIds.map((recipient) => ({
    school,
    recipient,
    sender: req.user._id,
    type,
    title,
    message,
    relatedLink,
    isHighPriority,
  }));
  const created = await Notification.insertMany(docs);

  return res.status(201).json(new ApiResponse(201, { sentCount: created.length }, `Notification sent to ${created.length} user(s)`));
});

module.exports = { listMyNotifications, getUnreadCount, markRead, markAllRead, sendNotification };