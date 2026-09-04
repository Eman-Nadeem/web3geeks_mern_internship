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
} else {
  // Isolate tests into dedicated vitest_test_db namespace to protect dev seed data
  if (process.env.MONGODB_URI.includes('?')) {
    process.env.MONGODB_URI = process.env.MONGODB_URI.replace(/\/?\?/, '/vitest_test_db?');
  } else if (!process.env.MONGODB_URI.endsWith('/vitest_test_db')) {
    process.env.MONGODB_URI = `${process.env.MONGODB_URI.replace(/\/$/, '')}/vitest_test_db`;
  }
}

process.env.JWT_SECRET = process.env.JWT_SECRET;
(process.env as any).NODE_ENV = 'test';

afterAll(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
});
