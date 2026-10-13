require('dotenv').config();

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/user');

async function createAdmin() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    const email = process.env.ADMIN_EMAIL;
    const password = process.env.ADMIN_PASSWORD;
    const name = process.env.ADMIN_NAME || 'SmartBite Admin';

    if (!email || !password) {
      throw new Error(
        'Set ADMIN_EMAIL and ADMIN_PASSWORD in your .env file.'
      );
    }

    if (password.length < 12 || password.length > 72) {
      throw new Error(
        'Admin password must contain between 12 and 72 characters.'
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    let admin = await User.findOne({ email: normalizedEmail })
      .select('+password');

    if (admin) {
      if (admin.role !== 'admin') {
        throw new Error(
          'This email already belongs to a non-admin account. Use a different ADMIN_EMAIL.'
        );
      }

      console.log('This admin account already exists. No changes made.');
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    admin = await User.create({
      name,
      email: normalizedEmail,
      password: hashedPassword,
      role: 'admin'
    });

    console.log('Admin account created successfully.');
    console.log('Admin email:', admin.email);
  } catch (error) {
    console.error('Admin setup failed:', error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

createAdmin();