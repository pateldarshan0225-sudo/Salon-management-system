import Appointment from '../models/Appointment.js';
import AppointmentService from '../models/AppointmentService.js';
import Service from '../models/Service.js';
import Category from '../models/ServiceCategory.js';
import Staff from '../models/Staff.js';
import Bill from '../models/Bill.js';
import Review from '../models/Review.js';
import { assert, id, number, date, time, text, oneOf } from '../utils/validation.js';
import { availableSlots, minutes, timeString, canCancel, withBookingLock, checkBookingDate } from '../utils/slots.js';
import { list, send } from '../utils/pagination.js';
import { owner } from '../middleware/authMiddleware.js';
import { resolveOffer } from './offerController.js';

async function freeSlots(staff, value, duration) {
  const appointments = await Appointment.find({ staffId: staff._id, appointmentDate: value, status: { $in: ['Pending', 'Confirmed'] } });
  return availableSlots(staff, value, duration, appointments);
}
export async function getSlots(req, res) {
  const value = date(req.query.date); checkBookingDate(value);
  const duration = number(req.query.duration, 'Duration', 1, 1440);
  let specialists;
  if (req.query.staffId && req.query.staffId !== 'any') specialists = await Staff.find({ _id: id(req.query.staffId), isActive: true });
  else specialists = await Staff.find({ categoryId: id(req.query.categoryId, 'category'), isActive: true }).sort({ _id: 1 });
  const result = new Set();
  for (const staff of specialists) {
    if (!await Category.exists({ _id: staff.categoryId, isActive: true })) continue;
    for (const slot of await freeSlots(staff, value, duration)) result.add(slot);
  }
  send(res, [...result].sort());
}
export async function createAppointment(req, res) {
  await withBookingLock(async () => {
    const body = req.body; date(body.appointmentDate); time(body.startTime); checkBookingDate(body.appointmentDate);
    assert(Array.isArray(body.serviceIds) && body.serviceIds.length > 0 && body.serviceIds.length <= 20, 'Select 1–20 services.');
    body.serviceIds.forEach(value => id(value, 'service'));
    assert(new Set(body.serviceIds).size === body.serviceIds.length, 'Select each service only once.');
    const found = await Service.find({ _id: { $in: body.serviceIds }, isActive: true });
    assert(found.length === body.serviceIds.length, 'One or more services are unavailable.');
    const services = body.serviceIds.map(value => found.find(s => String(s._id) === value));
    const categories = [...new Set(services.map(s => String(s.categoryId)))];
    assert(await Category.countDocuments({ _id: { $in: categories }, isActive: true }) === categories.length, 'A selected category is unavailable.');
    const totalDuration = services.reduce((sum, s) => sum + s.duration, 0);
    const totalAmount = services.reduce((sum, s) => sum + s.price, 0);
    let specialists;
    if (!body.staffId || body.staffId === 'any') specialists = await Staff.find({ categoryId: services[0].categoryId, isActive: true }).sort({ _id: 1 });
    else specialists = await Staff.find({ _id: id(body.staffId, 'specialist'), categoryId: services[0].categoryId, isActive: true });
    let selected;
    for (const staff of specialists) if ((await freeSlots(staff, body.appointmentDate, totalDuration)).includes(body.startTime)) { selected = staff; break; }
    assert(selected, 'This slot is taken or unavailable. Choose another time or specialist.', 409);
    let offerId = null; let discountAmount = 0;
    if (body.offerCode) { const result = await resolveOffer(body.offerCode, totalAmount); offerId = result.offer._id; discountAmount = result.discountAmount; }
    const appointment = await Appointment.create({ userId: req.session.account.id, staffId: selected._id, appointmentDate: body.appointmentDate, startTime: body.startTime, endTime: timeString(minutes(body.startTime) + totalDuration), totalDuration, totalAmount, offerId, discountAmount, notes: text(body.notes, 'Notes', 1000, false) });
    try {
      await AppointmentService.insertMany(services.map(s => ({ appointmentId: appointment._id, serviceId: s._id, price: s.price, duration: s.duration })));
    } catch (error) { await AppointmentService.deleteMany({ appointmentId: appointment._id }); await appointment.deleteOne(); throw error; }
    send(res, appointment, 'Appointment booked. Your booking is pending confirmation.', 201);
  });
}
export async function getAppointments(req, res) {
  const filter = req.session.account.role === 'user' ? { userId: req.session.account.id } : {};
  if (req.query.status) filter.status = oneOf(req.query.status, ['Pending', 'Confirmed', 'Completed', 'Cancelled'], 'status');
  if (req.query.date) filter.appointmentDate = date(req.query.date);
  send(res, await list(Appointment, filter, req.query, 'userId staffId offerId', { appointmentDate: -1, startTime: -1 }));
}
export async function getAppointment(req, res) {
  const appointment = await Appointment.findById(req.params.id).populate('userId staffId offerId');
  assert(appointment, 'Appointment not found.', 404);
  if (req.session.account.role === 'user') owner(appointment, req);
  const [services, bill, review] = await Promise.all([AppointmentService.find({ appointmentId: appointment._id }).populate('serviceId'), Bill.findOne({ appointmentId: appointment._id }), Review.findOne({ appointmentId: appointment._id })]);
  send(res, { appointment, services, bill, review });
}
export async function cancelAppointment(req, res) {
  await withBookingLock(async () => {
    const appointment = await Appointment.findById(req.params.id); owner(appointment, req);
    assert(['Pending', 'Confirmed'].includes(appointment.status), 'Only pending or confirmed appointments can be cancelled.');
    assert(canCancel(appointment), 'Appointments can only be cancelled at least 2 hours before the start.');
    appointment.status = 'Cancelled'; await appointment.save(); send(res, appointment, 'Appointment cancelled.');
  });
}
export async function updateStatus(req, res) {
  await withBookingLock(async () => {
    const appointment = await Appointment.findById(req.params.id); assert(appointment, 'Appointment not found.', 404);
    const next = oneOf(req.body.status, ['Confirmed', 'Completed', 'Cancelled'], 'status');
    const allowed = { Pending: ['Confirmed', 'Cancelled'], Confirmed: ['Completed', 'Cancelled'], Completed: [], Cancelled: [] };
    assert(allowed[appointment.status].includes(next), `Cannot change ${appointment.status} to ${next}.`);
    if (next === 'Completed') {
      // Idempotent upsert protects the unique appointment bill.
      await Bill.updateOne({ appointmentId: appointment._id }, { $setOnInsert: { subtotal: appointment.totalAmount, discount: appointment.discountAmount, finalAmount: appointment.totalAmount - appointment.discountAmount, paymentStatus: 'Unpaid', paymentMode: 'Cash' } }, { upsert: true, runValidators: true });
    }
    appointment.status = next; await appointment.save(); send(res, appointment, 'Appointment status updated.');
  });
}
