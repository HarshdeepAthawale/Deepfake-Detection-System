/**
 * User Seeding Script
 * Creates initial users for testing and development
 */

import { connectDB } from '../src/config/db.js';
import User from '../src/users/user.model.js';
import { ROLES } from '../src/security/rbac.js';
import logger from '../src/utils/logger.js';

const users = [
  {
    email: 'admin@sentinel.com',
    operativeId: 'ADMIN_1',
    role: ROLES.ADMIN,
    metadata: {
      firstName: 'System',
      lastName: 'Administrator',
      department: 'IT',
      clearanceLevel: 'TOP_SECRET',
    },
  },
  {
    email: 'operative@sentinel.com',
    password: 'operative123',
    operativeId: 'GHOST_1',
    role: ROLES.OPERATIVE,
    metadata: {
      firstName: 'John',
      lastName: 'Operative',
      department: 'Field Operations',
      clearanceLevel: 'SECRET',
    },
  },
  {
    email: 'analyst@sentinel.com',
    password: 'analyst123',
    operativeId: 'ANALYST_1',
    role: ROLES.ANALYST,
    metadata: {
      firstName: 'Jane',
      lastName: 'Analyst',
      department: 'Intelligence',
      clearanceLevel: 'SECRET',
    },
  },
];

const seedUsers = async () => {
  try {
    logger.info('Connecting to database...');
    await connectDB();

    logger.info('Seeding users...');

    for (const userData of users) {
      // Check if user already exists
      const existingUser = await User.findOne({
        $or: [
          { email: userData.email },
          { operativeId: userData.operativeId },
        ],
      });

      if (existingUser) {
        logger.info(`User already exists: ${userData.email} (${userData.operativeId})`);
        continue;
      }

      const user = new User(userData);
      await user.save();
      logger.info(`✅ Created user: ${userData.email} (${userData.operativeId}) - Role: ${userData.role}`);
    }

    logger.info('✅ User seeding completed!');
    logger.info('\n📋 Default Users:');
    logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    users.forEach((u) => {
      logger.info(`Email: ${u.email}`);
      logger.info(`Password: ${u.password}`);
      logger.info(`Operative ID: ${u.operativeId}`);
      logger.info(`Role: ${u.role}`);
      logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    });

    process.exit(0);
  } catch (error) {
    logger.error('Seeding error:', error);
    process.exit(1);
  }
};

seedUsers();



