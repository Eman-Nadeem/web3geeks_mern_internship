import dotenv from 'dotenv';
import path from 'path';
import mongoose from 'mongoose';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });
if (!process.env.MONGODB_URI) {
  dotenv.config({ path: path.resolve(__dirname, '../.env.example') });
}

import { User } from '../models/User';
import { Organization } from '../models/Organization';

async function check() {
  await mongoose.connect(process.env.MONGODB_URI || '');
  const userCount = await User.countDocuments();
  const users = await User.find({}, 'email role status fullName');
  console.log(`TOTAL USERS IN DB: ${userCount}`);
  console.log(JSON.stringify(users, null, 2));
  await mongoose.disconnect();
}

check().catch(console.error);
