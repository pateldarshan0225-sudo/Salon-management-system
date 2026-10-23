import bcrypt from 'bcrypt';
import User from '../models/User.js';
import Appointment from '../models/Appointment.js';
import AppointmentService from '../models/AppointmentService.js';
import Bill from '../models/Bill.js';
import Review from '../models/Review.js';
import { assert, profileInput, password } from '../utils/validation.js';
import { list, send } from '../utils/pagination.js';
import { withBookingLock } from '../utils/slots.js';
import { cookieName, cookieOptions } from '../config/session.js';
export const getProfile = async (req, res) => { const user = await User.findById(req.session.account.id); assert(user, 'Account not found.', 404); send(res, user); };
export const updateProfile = async (req, res) => { const user = await User.findByIdAndUpdate(req.session.account.id, profileInput(req.body), { new: true, runValidators: true }); assert(user, 'Account not found.', 404); req.session.account.name = user.name; req.session.account.email = user.email; send(res, user, 'Profile updated.'); };
export async function updatePassword(req, res) {
  const user = await User.findById(req.session.account.id).select('+password'); assert(user, 'Account not found.', 404);
  assert(typeof req.body.currentPassword === 'string' && await bcrypt.compare(req.body.currentPassword, user.password), 'Current password is incorrect.');
  password(req.body.newPassword); user.password = await bcrypt.hash(req.body.newPassword, Number(process.env.BCRYPT_ROUNDS) || 12); await user.save(); send(res, null, 'Password changed.');
}
export async function removeUser(userId) {
  await withBookingLock(async () => {
    assert(await User.exists({ _id: userId }), 'Customer not found.', 404);
    const ids = await Appointment.find({ userId }).distinct('_id');
    await AppointmentService.deleteMany({ appointmentId: { $in: ids } });
    await Bill.deleteMany({ appointmentId: { $in: ids } });
    await Review.deleteMany({ $or: [{ userId }, { appointmentId: { $in: ids } }] });
    await Appointment.deleteMany({ userId }); await User.findByIdAndDelete(userId);
  });
}
export async function deleteProfile(req, res) { await removeUser(req.session.account.id); await new Promise((resolve, reject) => req.session.destroy(error => error ? reject(error) : resolve())); res.clearCookie(cookieName(), cookieOptions()); send(res, null, 'Account and all related records deleted.'); }
export const getUsers = async (req, res) => send(res, await list(User, {}, req.query));
export const deleteUser = async (req, res) => { await removeUser(req.params.id); send(res, null, 'Customer and related records deleted.'); };
