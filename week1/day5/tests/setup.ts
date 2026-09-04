import { beforeAll, afterAll } from 'vitest';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config({ path: '.env.local' });
if (!process.env.MONGODB_URI) {
  dotenv.config({ path: '.env' });
}

// Fallback test database if needed
if (!process.env.MONGODB_URI) {
  process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/multi_tenant_pm_test';
}

process.env.JWT_SECRET = process.env.JWT_SECRET;
(process.env as any).NODE_ENV = 'test';

afterAll(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
});
