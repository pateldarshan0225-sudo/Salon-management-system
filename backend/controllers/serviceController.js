import Service from '../models/Service.js';
import Category from '../models/ServiceCategory.js';
import AppointmentService from '../models/AppointmentService.js';
import { assert, text, url, boolean, number, id } from '../utils/validation.js';
import { list, send } from '../utils/pagination.js';
export async function serviceInput(body) {
  const categoryId = id(body.categoryId, 'category'); assert(await Category.exists({ _id: categoryId }), 'Category not found.');
  const duration = number(body.duration, 'Duration', 1, 1440); assert(Number.isInteger(duration), 'Duration must be whole minutes.');
  return { name: text(body.name, 'Name', 100), categoryId, price: number(body.price, 'Price', 0.01), duration, description: text(body.description, 'Description', 3000, false), image: url(body.image), isActive: boolean(body.isActive ?? true) };
}
export async function serviceFilter(query, publicOnly = false) {
  const filter = publicOnly ? { isActive: true, categoryId: { $in: await Category.find({ isActive: true }).distinct('_id') } } : {};
  if (query.categoryId) { id(query.categoryId, 'category'); if (!publicOnly || await Category.exists({ _id: query.categoryId, isActive: true })) filter.categoryId = query.categoryId; else filter.categoryId = { $in: [] }; }
  if (query.search) filter.name = { $regex: text(query.search, 'Search', 100).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
  if (query.maxPrice) filter.price = { $lte: number(query.maxPrice, 'Maximum price') };
  return filter;
}
export const serviceSort = query => ({ price: { price: 1 }, '-price': { price: -1 }, name: { name: 1 }, '-name': { name: -1 } }[query.sort] || { name: 1 });
export const getServices = async (req, res) => send(res, await list(Service, await serviceFilter(req.query), req.query, 'categoryId', serviceSort(req.query)));
export const getService = async (req, res) => { const row = await Service.findById(req.params.id).populate('categoryId'); assert(row, 'Service not found.', 404); send(res, row); };
export const createService = async (req, res) => send(res, await Service.create(await serviceInput(req.body)), 'Service created.', 201);
export const updateService = async (req, res) => { const row = await Service.findByIdAndUpdate(req.params.id, await serviceInput(req.body), { new: true, runValidators: true }); assert(row, 'Service not found.', 404); send(res, row, 'Service updated.'); };
export const deleteService = async (req, res) => { assert(!await AppointmentService.exists({ serviceId: req.params.id }), 'Service has bookings. Set it inactive instead.', 409); assert(await Service.findByIdAndDelete(req.params.id), 'Service not found.', 404); send(res, null, 'Service deleted.'); };
