const { z } = require('zod');

const createTeacherSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().optional().default(''),
  email: z.string().email(),
  password: z.string().min(6),
  phone: z.string().optional(),
  gender: z.enum(['Male', 'Female', 'Other']).optional(),
  dob: z.string().optional(),
  cnic: z.string().optional(),
  bloodGroup: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  emergencyContact: z.string().optional(),
  department: z.string().optional(),
  designation: z.string().optional(),
  qualification: z.string().optional(),
  specialization: z.string().optional(),
  experienceYears: z.string().optional(),
  employmentType: z.enum(['Full Time', 'Part Time', 'Contract']).optional(),
  assignedClasses: z.array(z.string()).optional(),
  assignedSections: z.array(z.string()).optional(),
  subjects: z.array(z.string()).optional(),
  classTeacherOf: z.string().optional(),
  basicSalary: z.number().optional(),
  allowances: z.number().optional(),
  bonus: z.number().optional(),
  tax: z.number().optional(),
  attendanceDeduction: z.number().optional(),
  bankAccount: z.string().optional(),
  checkInTime: z.string().optional(),
  checkOutTime: z.string().optional(),
});

const updateTeacherSchema = createTeacherSchema.partial().omit({ password: true });

module.exports = { createTeacherSchema, updateTeacherSchema };