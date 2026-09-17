/**
 * Development/testing seed script ONLY (Section 6.2).
 * Creates exactly one School and one Super Admin account so you can log in
 * locally. Refuses to run when NODE_ENV=production, and refuses to run
 * against a database that already has a Super Admin - it is not meant to
 * be re-run against a live school database.
 *
 * Usage:
 *   node src/seed/devSeed.js
 * or:
 *   npm run seed:dev
 *
 * Override defaults via env vars:
 *   SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD, SEED_ADMIN_NAME, SEED_SCHOOL_NAME
 */
const { env, assertRequiredEnv } = require('../config/env');
const connectDB = require('../config/db');
const logger = require('../utils/logger');
const { User, School } = require('../models');

async function run() {
  if (env.isProd) {
    logger.error('Refusing to run devSeed in production. Use the one-time setup flow instead (Section 6.2).');
    process.exit(1);
  }

  assertRequiredEnv();
  await connectDB();

  const existingAdmin = await User.findOne({ role: { $in: ['super_admin', 'school_admin'] } });
  if (existingAdmin) {
    logger.warn('An admin account already exists - devSeed will not create a duplicate. Exiting.');
    process.exit(0);
  }

  const school = await School.create({
    name: process.env.SEED_SCHOOL_NAME || 'Demo School (Dev Only)',
    currentAcademicSession: '2026-2027',
  });

  const admin = new User({
    fullName: process.env.SEED_ADMIN_NAME || 'Dev Super Admin',
    email: process.env.SEED_ADMIN_EMAIL || 'admin@dev.local',
    role: 'super_admin',
    school: school._id,
    isEmailVerified: true, // skip email flow for local dev convenience
    isActive: true,
  });
  await admin.setPassword(process.env.SEED_ADMIN_PASSWORD || 'ChangeMe123!');
  await admin.save();

  logger.info('Dev seed complete.');
  logger.info(`  School:        ${school.name} (${school._id})`);
  logger.info(`  Admin email:   ${admin.email}`);
  logger.info(`  Admin password: ${process.env.SEED_ADMIN_PASSWORD || 'ChangeMe123!'} (change this immediately)`);

  process.exit(0);
}

run().catch((err) => {
  logger.error('Dev seed failed', err);
  process.exit(1);
});
