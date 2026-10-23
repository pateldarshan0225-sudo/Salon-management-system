import Review from '../models/Review.js';
import Appointment from '../models/Appointment.js';
import { assert, id, number, text } from '../utils/validation.js';
import { owner } from '../middleware/authMiddleware.js';
import { list, send } from '../utils/pagination.js';
function input(body) { const rating = number(body.rating, 'Rating', 1, 5); assert(Number.isInteger(rating), 'Rating must be a whole number.'); return { rating, comment: text(body.comment, 'Review', 1500) }; }
export async function createReview(req, res) {
  const appointmentId = id(req.body.appointmentId, 'appointment');
  const appointment = await Appointment.findById(appointmentId); owner(appointment, req);
  assert(appointment.status === 'Completed', 'Reviews are available only after your appointment is completed.');
  send(res, await Review.create({ ...input(req.body), userId: req.session.account.id, appointmentId }), 'Thank you for sharing your experience.', 201);
}
export const getReviews = async (req, res) => send(res, await list(Review, req.session.account.role === 'user' ? { userId: req.session.account.id } : {}, req.query, 'userId appointmentId', { createdAt: -1 }));
async function findReview(req) { const review = await Review.findById(id(req.params.id || req.body.id || req.query.id, 'review')); assert(review, 'Review not found.', 404); if (req.session.account.role === 'user') owner(review, req); return review; }
export const updateReview = async (req, res) => { const review = await findReview(req); Object.assign(review, input(req.body)); await review.save(); send(res, review, 'Review updated.'); };
export const deleteReview = async (req, res) => { const review = await findReview(req); await review.deleteOne(); send(res, null, 'Review deleted.'); };
