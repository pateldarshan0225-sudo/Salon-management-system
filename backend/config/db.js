import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const directory = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(directory, '../.env'), quiet: true });

export function validateEnvironment() {
  for (const key of ['MONGODB_URI', 'SESSION_SECRET', 'SESSION_MONGODB_URI']) {
    if (!process.env[key]) throw new Error(`Missing ${key}. Configure backend/.env using .env.example.`);
  }
  if (process.env.MONGODB_URI === process.env.SESSION_MONGODB_URI) {
    throw new Error('SESSION_MONGODB_URI must use a separate session database.');
  }
}

export async function connectDB() {
  validateEnvironment();
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 8000 });
}
