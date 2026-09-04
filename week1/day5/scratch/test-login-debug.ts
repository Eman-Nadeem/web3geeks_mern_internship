import dotenv from 'dotenv';
import path from 'path';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

import { User } from '../models/User';

async function debugLogin() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('No MONGODB_URI');
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log('Connected to MongoDB');

  const email = 'admin@acme.com';
  const password = 'Password123!';

  const user = await User.findOne({ email: email.toLowerCase() });
  console.log('User found in DB:', user ? { id: user._id, email: user.email, role: user.role, status: user.status } : null);

  if (user) {
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    console.log('Password valid:', isPasswordValid);
  }

  await mongoose.disconnect();
}

debugLogin();
