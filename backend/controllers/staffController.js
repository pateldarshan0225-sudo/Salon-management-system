import Staff from '../models/Staff.js';
import Category from '../models/ServiceCategory.js';
import Appointment from '../models/Appointment.js';
import { assert, text, phone, url, boolean, number, id, time } from '../utils/validation.js';
import { list, send } from '../utils/pagination.js';
async function input(body) {
  const categoryId = id(body.categoryId, 'category'); assert(await Category.exists({ _id: categoryId }), 'Category not found.');
  assert(Array.isArray(body.workingDays) && body.workingDays.length && body.workingDays.every(d => ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].includes(d)), 'Choose valid working days.');
  time(body.startTime); time(body.endTime); assert(body.startTime < body.endTime, 'End time must be after start time.');
  return { name: text(body.name, 'Name', 80), phone: phone(body.phone), categoryId, experienceYears: number(body.experienceYears, 'Experience', 0, 60), bio: text(body.bio, 'Bio', 2000, false), image: url(body.image), workingDays: [...new Set(body.workingDays)], startTime: body.startTime, endTime: body.endTime, isActive: boolean(body.isActive ?? true) };
}
export const getStaff = async (req, res) => send(res, await list(Staff, {}, req.query, 'categoryId', { name: 1 }));
export const getStaffMember = async (req, res) => { const row = await Staff.findById(req.params.id).populate('categoryId'); assert(row, 'Specialist not found.', 404); send(res, row); };
export const createStaff = async (req, res) => send(res, await Staff.create(await input(req.body)), 'Specialist created.', 201);
export const updateStaff = async (req, res) => { const row = await Staff.findByIdAndUpdate(req.params.id, await input(req.body), { new: true, runValidators: true }); assert(row, 'Specialist not found.', 404); send(res, row, 'Specialist updated.'); };
export const deleteStaff = async (req, res) => { assert(!await Appointment.exists({ staffId: req.params.id }), 'Specialist has appointments. Set inactive instead.', 409); assert(await Staff.findByIdAndDelete(req.params.id), 'Specialist not found.', 404); send(res, null, 'Specialist deleted.'); };
