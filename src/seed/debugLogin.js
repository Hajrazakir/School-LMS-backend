/**
 * One-off diagnostic: checks exactly why login is failing.
 * Usage: node src/seed/debugLogin.js
 */
const connectDB = require('../config/db');
const logger = require('../utils/logger');
const { User } = require('../models');

async function run() {
  await connectDB();

  const allUsers = await User.find({}).select('+passwordHash');
  console.log(`\nTotal users in DB: ${allUsers.length}`);

  for (const u of allUsers) {
    console.log('----------------------------');
    console.log('Email in DB:', JSON.stringify(u.email));
    console.log('Role:', u.role);
    console.log('isActive:', u.isActive);
    console.log('passwordHash exists:', !!u.passwordHash);

    const testPassword = 'ChangeMe123!';
    const matches = await u.comparePassword(testPassword);
    console.log(`Does "${testPassword}" match this user's password?`, matches);
  }

  process.exit(0);
}

run().catch((err) => {
  console.error('Debug failed', err);
  process.exit(1);
});