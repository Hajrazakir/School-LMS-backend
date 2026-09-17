const express = require('express');
const { verifyJWT, authorizeRoles } = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validate');
const teacherController = require('../controllers/teacherAdmin.controller');
const { createTeacherSchema, updateTeacherSchema } = require('../validators/teacher.validator');
const studentController = require('../controllers/studentAdmin.controller');
const { createStudentSchema, updateStudentSchema } = require('../validators/student.validator');
const classController = require('../controllers/class.controller');
const { createClassSchema, updateClassSchema } = require('../validators/class.validator');
const userAdminController = require('../controllers/userAdmin.controller');
const { updateUserSchema, resetPasswordSchema, setStatusSchema } = require('../validators/userAdmin.validator');
const parentController = require('../controllers/parentAdmin.controller');
const { createParentSchema, updateParentSchema } = require('../validators/parentAdmin.validator');

const router = express.Router();

router.use(verifyJWT);
router.use(authorizeRoles('super_admin', 'school_admin', 'accountant'));

// Teacher registration (FR-2.2 / FR-2.3)
router.post('/teachers', validate(createTeacherSchema), teacherController.createTeacher);
router.get('/teachers', teacherController.listTeachers);
router.get('/teachers/:id', teacherController.getTeacher);
router.patch('/teachers/:id', validate(updateTeacherSchema), teacherController.updateTeacher);
router.patch('/teachers/:id/status', teacherController.setTeacherStatus);
router.delete('/teachers/:id', teacherController.deleteTeacher);

// Student registration (FR-2.4 / gap-analysis module 4)
router.post('/students', validate(createStudentSchema), studentController.createStudent);
router.get('/students', studentController.listStudents);
router.get('/students/:id', studentController.getStudent);
router.patch('/students/:id', validate(updateStudentSchema), studentController.updateStudent);
router.patch('/students/:id/status', studentController.setStudentStatus);
router.delete('/students/:id', studentController.deleteStudent);

// Classes & sections (gap-analysis module 5 / prerequisite for student registration)
router.post('/classes', validate(createClassSchema), classController.createClass);
router.get('/classes', classController.listClasses);
router.get('/classes/:id', classController.getClass);
router.patch('/classes/:id', validate(updateClassSchema), classController.updateClass);
router.delete('/classes/:id', classController.deleteClass);

// Parent registration (FR-12.1 multi-child linking)
router.post('/parents', validate(createParentSchema), parentController.createParent);
router.get('/parents', parentController.listParents);
router.get('/parents/:id', parentController.getParent);
router.patch('/parents/:id', validate(updateParentSchema), parentController.updateParent);
router.delete('/parents/:id', parentController.deleteParent);

// General user management (gap-analysis module 10) - super_admin/school_admin only,
// stricter than the router-level accountant access above.
const superAdminOrSchoolAdmin = authorizeRoles('super_admin', 'school_admin');
router.get('/users', superAdminOrSchoolAdmin, userAdminController.listUsers);
router.get('/users/:id', superAdminOrSchoolAdmin, userAdminController.getUser);
router.patch('/users/:id', superAdminOrSchoolAdmin, validate(updateUserSchema), userAdminController.updateUser);
router.patch('/users/:id/reset-password', superAdminOrSchoolAdmin, validate(resetPasswordSchema), userAdminController.resetPassword);
router.patch('/users/:id/status', superAdminOrSchoolAdmin, validate(setStatusSchema), userAdminController.setStatus);
router.delete('/users/:id', superAdminOrSchoolAdmin, userAdminController.deleteUser);

module.exports = router;