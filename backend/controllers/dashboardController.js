import User from '../models/User.js';
import Service from '../models/Service.js';
import Staff from '../models/Staff.js';
import Appointment from '../models/Appointment.js';
import Review from '../models/Review.js';
import Bill from '../models/Bill.js';
import { clock } from '../utils/slots.js';
import { send } from '../utils/pagination.js';
export async function dashboard(req, res) {
  const [customers, activeServices, staff, todayAppointments, pendingAppointments, revenue, recentAppointments, recentReviews] = await Promise.all([
    User.countDocuments(), Service.countDocuments({ isActive: true }), Staff.countDocuments(), Appointment.countDocuments({ appointmentDate: clock().date }), Appointment.countDocuments({ status: 'Pending' }), Bill.aggregate([{ $match: { paymentStatus: 'Paid' } }, { $group: { _id: null, total: { $sum: '$finalAmount' } } }]), Appointment.find().populate('userId staffId').sort({ createdAt: -1 }).limit(5), Review.find().populate('userId', 'name').sort({ createdAt: -1 }).limit(5),
  ]);
  send(res, { customers, activeServices, staff, todayAppointments, pendingAppointments, totalRevenue: revenue[0]?.total || 0, recentAppointments, recentReviews });
}
