import Category from '../models/ServiceCategory.js';
import Service from '../models/Service.js';
import Staff from '../models/Staff.js';
import Offer from '../models/Offer.js';
import Review from '../models/Review.js';
import User from '../models/User.js';
import Appointment from '../models/Appointment.js';
import { list, send } from '../utils/pagination.js';
import { clock } from '../utils/slots.js';
import { assert } from '../utils/validation.js';
import { serviceFilter, serviceSort } from './serviceController.js';
export const categories = async (req, res) => send(res, await list(Category, { isActive: true }, req.query, '', { name: 1 }));
export const services = async (req, res) => send(res, await list(Service, await serviceFilter(req.query, true), req.query, 'categoryId', serviceSort(req.query)));
export const service = async (req, res) => { const item = await Service.findOne({ _id: req.params.id, isActive: true }).populate('categoryId'); assert(item && item.categoryId?.isActive, 'Treatment not found.', 404); send(res, item); };
export const staff = async (req, res) => send(res, await list(Staff, { isActive: true, categoryId: { $in: await Category.find({ isActive: true }).distinct('_id') } }, req.query, 'categoryId', { name: 1 }));
export const offers = async (req, res) => { const today = clock().date; send(res, await list(Offer, { isActive: true, validFrom: { $lte: today }, validTo: { $gte: today } }, req.query)); };
export const reviews = async (req, res) => send(res, await list(Review, {}, req.query, { path: 'userId', select: 'name' }, { createdAt: -1 }));
export async function statsData() { const [happyCustomers, services, specialists, completedAppointments] = await Promise.all([User.countDocuments(), Service.countDocuments({ isActive: true }), Staff.countDocuments({ isActive: true }), Appointment.countDocuments({ status: 'Completed' })]); return { happyCustomers, services, specialists, completedAppointments }; }
export const stats = async (req, res) => send(res, await statsData());
