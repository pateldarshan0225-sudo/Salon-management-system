import { fail } from '../utils/validation.js';
import User from '../models/User.js';
import Admin from '../models/Admin.js';
const requireRole = role => async (req, res, next) => {
  if (!req.session.account) return next(Object.assign(new Error('Please log in.'), { status: 401 }));
  if (req.session.account.role !== role) return next(Object.assign(new Error('This account cannot access this area.'), { status: 403 }));
  // A deleted account must not keep working through an old session cookie.
  const Model = role === 'admin' ? Admin : User;
  if (!await Model.exists({ _id: req.session.account.id })) return next(Object.assign(new Error('Your account no longer exists. Please log in.'), { status: 401 }));
  next();
};
export const isUser = requireRole('user');
export const isAdmin = requireRole('admin');
export function owner(record, req) { if (!record) fail('Record not found.', 404); if (String(record.userId?._id || record.userId) !== req.session.account.id) fail('This record belongs to another customer.', 403); }
