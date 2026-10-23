import Category from '../models/ServiceCategory.js';
import Service from '../models/Service.js';
import Staff from '../models/Staff.js';
import { assert, text, url, boolean } from '../utils/validation.js';
import { list, send } from '../utils/pagination.js';
export const input = body => ({ name: text(body.name, 'Name', 80), description: text(body.description, 'Description', 2000, false), image: url(body.image), isActive: boolean(body.isActive ?? true) });
export const getCategories = async (req, res) => send(res, await list(Category, {}, req.query, '', { name: 1 }));
export const getCategory = async (req, res) => { const row = await Category.findById(req.params.id); assert(row, 'Category not found.', 404); send(res, row); };
export const createCategory = async (req, res) => send(res, await Category.create(input(req.body)), 'Category created.', 201);
export const updateCategory = async (req, res) => { const row = await Category.findByIdAndUpdate(req.params.id, input(req.body), { new: true, runValidators: true }); assert(row, 'Category not found.', 404); send(res, row, 'Category updated.'); };
export const deleteCategory = async (req, res) => {
  assert(!await Service.exists({ categoryId: req.params.id }) && !await Staff.exists({ categoryId: req.params.id }), 'Category has related services or specialists. Set it inactive instead.', 409);
  assert(await Category.findByIdAndDelete(req.params.id), 'Category not found.', 404); send(res, null, 'Category deleted.');
};
