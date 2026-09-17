const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const { Timetable } = require('../models');

/**
 * FR-15.2: prevents double-booking a teacher, a class/section, or a room
 * in an overlapping time range on the same day. HH:mm strings compare
 * correctly with plain string operators since they're zero-padded 24h.
 */
async function assertNoConflicts(school, { day, startTime, endTime, teacher, class: classId, section, room }, excludeId) {
  const overlap = { startTime: { $lt: endTime }, endTime: { $gt: startTime } };
  const base = { school, day, ...overlap };
  if (excludeId) base._id = { $ne: excludeId };

  const teacherConflict = await Timetable.findOne({ ...base, teacher });
  if (teacherConflict) throw ApiError.conflict('This teacher already has another period scheduled in this time slot');

  const classConflict = await Timetable.findOne({ ...base, class: classId, section });
  if (classConflict) throw ApiError.conflict('This class/section already has another subject scheduled in this time slot');

  if (room) {
    const roomConflict = await Timetable.findOne({ ...base, room });
    if (roomConflict) throw ApiError.conflict('This room is already booked in this time slot');
  }
}

const createPeriod = asyncHandler(async (req, res) => {
  const b = req.body;
  const school = req.user.school;
  await assertNoConflicts(school, b);

  const period = await Timetable.create({ school, ...b });
  return res.status(201).json(new ApiResponse(201, { period }, 'Period scheduled'));
});

const listPeriods = asyncHandler(async (req, res) => {
  const filter = { school: req.user.school };
  ['class', 'section', 'teacher', 'day', 'room'].forEach((f) => {
    if (req.query[f]) filter[f] = req.query[f];
  });

  const periods = await Timetable.find(filter).populate('teacher').populate('subject').sort({ day: 1, startTime: 1 });
  return res.status(200).json(new ApiResponse(200, { periods }, 'Timetable fetched'));
});

const getPeriod = asyncHandler(async (req, res) => {
  const period = await Timetable.findOne({ _id: req.params.id, school: req.user.school })
    .populate('teacher')
    .populate('subject');
  if (!period) throw ApiError.notFound('Period not found');
  return res.status(200).json(new ApiResponse(200, { period }, 'Period fetched'));
});

const updatePeriod = asyncHandler(async (req, res) => {
  const period = await Timetable.findOne({ _id: req.params.id, school: req.user.school });
  if (!period) throw ApiError.notFound('Period not found');
  const b = req.body;

  const merged = {
    day: b.day ?? period.day,
    startTime: b.startTime ?? period.startTime,
    endTime: b.endTime ?? period.endTime,
    teacher: b.teacher ?? period.teacher,
    class: b.class ?? period.class,
    section: b.section ?? period.section,
    room: b.room ?? period.room,
  };
  if (merged.startTime >= merged.endTime) throw ApiError.badRequest('endTime must be after startTime');
  await assertNoConflicts(req.user.school, merged, period._id);

  Object.assign(period, merged);
  await period.save();

  return res.status(200).json(new ApiResponse(200, { period }, 'Period updated'));
});

const deletePeriod = asyncHandler(async (req, res) => {
  const period = await Timetable.findOne({ _id: req.params.id, school: req.user.school });
  if (!period) throw ApiError.notFound('Period not found');
  await period.deleteOne();
  return res.status(200).json(new ApiResponse(200, null, 'Period deleted'));
});

module.exports = { createPeriod, listPeriods, getPeriod, updatePeriod, deletePeriod };