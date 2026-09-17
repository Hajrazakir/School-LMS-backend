const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const { Conversation, Message, Parent, Teacher, Student, Class } = require('../models');

async function getParentProfile(req) {
  const parent = await Parent.findOne({ user: req.user._id, school: req.user.school });
  if (!parent) throw ApiError.badRequest('No parent record is linked to your account');
  return parent;
}

async function getTeacherProfile(req) {
  const teacher = await Teacher.findOne({ user: req.user._id, school: req.user.school });
  if (!teacher) throw ApiError.badRequest('No teacher record is linked to your account');
  return teacher;
}

/** A parent may only start a conversation with their child's actual class teacher (FR-13.2). */
const startConversation = asyncHandler(async (req, res) => {
  const parent = await getParentProfile(req);
  const { teacher: teacherId, student: studentId } = req.body;

  const isOwnChild = parent.children.some((c) => String(c) === String(studentId));
  if (!isOwnChild) throw ApiError.forbidden('You can only message about your own child');

  const student = await Student.findOne({ _id: studentId, school: req.user.school });
  if (!student) throw ApiError.notFound('Student not found');

  const studentClass = await Class.findOne({ _id: student.class, school: req.user.school });
  if (!studentClass?.classTeacher || String(studentClass.classTeacher) !== String(teacherId)) {
    throw ApiError.forbidden("You can only message your child's assigned class teacher");
  }

  const conversation = await Conversation.findOneAndUpdate(
    { parent: parent._id, teacher: teacherId, student: studentId },
    { $setOnInsert: { school: req.user.school, parent: parent._id, teacher: teacherId, student: studentId } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  return res.status(201).json(new ApiResponse(201, { conversation }, 'Conversation ready'));
});

/** Confirms the caller is a participant (or an admin) and the conversation isn't blocked. */
async function assertParticipant(req, conversation, { forWriting = false } = {}) {
  const isAdmin = ['super_admin', 'school_admin'].includes(req.user.role);
  if (isAdmin) return;

  if (req.user.role === 'parent') {
    const parent = await getParentProfile(req);
    if (String(conversation.parent) !== String(parent._id)) throw ApiError.forbidden('Not a participant in this conversation');
  } else if (req.user.role === 'teacher') {
    const teacher = await getTeacherProfile(req);
    if (String(conversation.teacher) !== String(teacher._id)) throw ApiError.forbidden('Not a participant in this conversation');
  } else {
    throw ApiError.forbidden('Not a participant in this conversation');
  }

  if (forWriting && conversation.isRestricted) {
    throw ApiError.forbidden('This conversation has been restricted by the school admin');
  }
}

const listConversations = asyncHandler(async (req, res) => {
  const filter = { school: req.user.school };
  if (req.user.role === 'parent') {
    const parent = await getParentProfile(req);
    filter.parent = parent._id;
  } else if (req.user.role === 'teacher') {
    const teacher = await getTeacherProfile(req);
    filter.teacher = teacher._id;
  }

  const conversations = await Conversation.find(filter)
    .populate('parent')
    .populate('teacher')
    .populate('student')
    .sort({ lastMessageAt: -1 });
  return res.status(200).json(new ApiResponse(200, { conversations }, 'Conversations fetched'));
});

const sendMessage = asyncHandler(async (req, res) => {
  const conversation = await Conversation.findOne({ _id: req.params.id, school: req.user.school });
  if (!conversation) throw ApiError.notFound('Conversation not found');
  await assertParticipant(req, conversation, { forWriting: true });

  const { text, attachments } = req.body;
  const message = await Message.create({
    conversation: conversation._id,
    sender: req.user._id,
    text,
    attachments,
    readBy: [req.user._id],
  });

  conversation.lastMessageAt = message.createdAt;
  conversation.lastMessagePreview = text ? text.slice(0, 120) : '[attachment]';
  await conversation.save();

  return res.status(201).json(new ApiResponse(201, { message }, 'Message sent'));
});

const listMessages = asyncHandler(async (req, res) => {
  const conversation = await Conversation.findOne({ _id: req.params.id, school: req.user.school });
  if (!conversation) throw ApiError.notFound('Conversation not found');
  await assertParticipant(req, conversation);

  const messages = await Message.find({ conversation: conversation._id, isDeleted: false })
    .populate('sender')
    .sort({ createdAt: -1 })
    .limit(100);
  return res.status(200).json(new ApiResponse(200, { messages }, 'Messages fetched'));
});

/** Marks every message in the conversation as read by the caller. */
const markRead = asyncHandler(async (req, res) => {
  const conversation = await Conversation.findOne({ _id: req.params.id, school: req.user.school });
  if (!conversation) throw ApiError.notFound('Conversation not found');
  await assertParticipant(req, conversation);

  await Message.updateMany(
    { conversation: conversation._id, readBy: { $ne: req.user._id } },
    { $addToSet: { readBy: req.user._id } }
  );

  return res.status(200).json(new ApiResponse(200, null, 'Marked as read'));
});

/** Sender can delete (soft) their own message (FR-13.4). */
const deleteMessage = asyncHandler(async (req, res) => {
  const message = await Message.findById(req.params.messageId);
  if (!message) throw ApiError.notFound('Message not found');
  if (String(message.sender) !== String(req.user._id)) throw ApiError.forbidden('You can only delete your own messages');

  message.isDeleted = true;
  message.text = undefined;
  message.attachments = [];
  await message.save();

  return res.status(200).json(new ApiResponse(200, null, 'Message deleted'));
});

/** Any participant can flag an inappropriate message for admin review. */
const reportMessage = asyncHandler(async (req, res) => {
  const message = await Message.findById(req.params.messageId);
  if (!message) throw ApiError.notFound('Message not found');

  const conversation = await Conversation.findOne({ _id: message.conversation, school: req.user.school });
  if (!conversation) throw ApiError.notFound('Conversation not found');
  await assertParticipant(req, conversation);

  message.isReported = true;
  message.reportedBy = req.user._id;
  message.reportReason = req.body.reason;
  await message.save();

  return res.status(200).json(new ApiResponse(200, { message }, 'Message reported'));
});

/** Admin blocks/unblocks a conversation entirely (FR-13.5). */
const setConversationRestriction = asyncHandler(async (req, res) => {
  const conversation = await Conversation.findOne({ _id: req.params.id, school: req.user.school });
  if (!conversation) throw ApiError.notFound('Conversation not found');

  conversation.isRestricted = req.body.isRestricted;
  await conversation.save();

  return res
    .status(200)
    .json(new ApiResponse(200, { conversation }, `Conversation ${req.body.isRestricted ? 'restricted' : 'unrestricted'}`));
});

/** Admin view: flagged messages across the school, for moderation. */
const listReportedMessages = asyncHandler(async (req, res) => {
  const conversationIds = await Conversation.find({ school: req.user.school }).distinct('_id');
  const messages = await Message.find({ conversation: { $in: conversationIds }, isReported: true })
    .populate('sender')
    .populate('conversation')
    .sort({ createdAt: -1 });
  return res.status(200).json(new ApiResponse(200, { messages }, 'Reported messages fetched'));
});

module.exports = {
  startConversation,
  listConversations,
  sendMessage,
  listMessages,
  markRead,
  deleteMessage,
  reportMessage,
  setConversationRestriction,
  listReportedMessages,
};