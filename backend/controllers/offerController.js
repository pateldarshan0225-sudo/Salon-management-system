import Offer from '../models/Offer.js';
import Appointment from '../models/Appointment.js';
import { assert, text, boolean, number, date } from '../utils/validation.js';
import { clock } from '../utils/slots.js';
import { list, send } from '../utils/pagination.js';
function input(body) {
  const code = text(body.code, 'Code', 30).toUpperCase(); assert(/^[A-Z0-9_-]+$/.test(code), 'Code may contain letters, numbers, underscores and hyphens.');
  date(body.validFrom); date(body.validTo); assert(body.validFrom <= body.validTo, 'Offer end date must follow start date.');
  return { title: text(body.title, 'Title', 100), code, discountPercent: number(body.discountPercent, 'Discount', 1, 90), validFrom: body.validFrom, validTo: body.validTo, isActive: boolean(body.isActive ?? true), description: text(body.description, 'Description', 2000, false) };
}
export async function resolveOffer(code, subtotal) {
  const today = clock().date;
  const offer = await Offer.findOne({ code: text(code, 'Offer code', 30).toUpperCase(), isActive: true, validFrom: { $lte: today }, validTo: { $gte: today } });
  assert(offer, 'Offer code is invalid, inactive or expired.');
  return { offer, discountAmount: Math.round(subtotal * offer.discountPercent / 100) };
}
export const validateOffer = async (req, res) => { const { offer, discountAmount } = await resolveOffer(req.body.code, number(req.body.totalAmount, 'Total amount', 0.01)); send(res, { offer, discountAmount }); };
export const getOffers = async (req, res) => send(res, await list(Offer, {}, req.query));
export const getOffer = async (req, res) => { const row = await Offer.findById(req.params.id); assert(row, 'Offer not found.', 404); send(res, row); };
export const createOffer = async (req, res) => send(res, await Offer.create(input(req.body)), 'Offer created.', 201);
export const updateOffer = async (req, res) => { const row = await Offer.findByIdAndUpdate(req.params.id, input(req.body), { new: true, runValidators: true }); assert(row, 'Offer not found.', 404); send(res, row, 'Offer updated.'); };
export const deleteOffer = async (req, res) => { assert(!await Appointment.exists({ offerId: req.params.id }), 'Offer has been used. Set it inactive instead.', 409); assert(await Offer.findByIdAndDelete(req.params.id), 'Offer not found.', 404); send(res, null, 'Offer deleted.'); };
