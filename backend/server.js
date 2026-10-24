import express from 'express';
import cors from 'cors';
import { pathToFileURL } from 'node:url';
import { connectDB } from './config/db.js';
import sessionMiddleware from './config/session.js';
import originMiddleware from './middleware/originMiddleware.js';
import errorMiddleware, { notFound } from './middleware/errorMiddleware.js';
import authRoutes from './routes/authRoutes.js';
import publicRoutes from './routes/publicRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import userRoutes from './routes/userRoutes.js';
import { uploadDirectory } from './utils/uploads.js';
import { completeDueAppointments, startCompletionTimer } from './utils/completeAppointments.js';

export function createApp() {
  const app = express(); app.disable('x-powered-by');
  if (process.env.NODE_ENV === 'production') app.set('trust proxy', 1);
  app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true }));
  app.use(originMiddleware); app.use(express.json({ limit: '100kb' })); app.use(sessionMiddleware());
  app.use('/uploads', express.static(uploadDirectory, { dotfiles:'deny', index:false, setHeaders:res => { res.setHeader('X-Content-Type-Options','nosniff'); } }));
  app.get('/api/health', (req, res) => res.json({ success: true, message: 'Salon API is running.', data: null }));
  app.use('/api', async (req,res,next) => { await completeDueAppointments(); next(); });
  app.use('/api/auth', authRoutes); app.use('/api/public', publicRoutes); app.use('/api/user', userRoutes); app.use('/api/admin', adminRoutes);
  app.use(notFound); app.use(errorMiddleware); return app;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { await connectDB(); await completeDueAppointments(); startCompletionTimer(); createApp().listen(Number(process.env.PORT) || 5000, () => console.log(`Salon API listening on port ${Number(process.env.PORT) || 5000}`)); }
  catch (error) { console.error(error.message.startsWith('Missing ') || error.message.startsWith('SESSION_') ? error.message : 'Database connection failed. Check MongoDB availability and backend/.env.'); process.exitCode = 1; }
}
