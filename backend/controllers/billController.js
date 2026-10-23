import Bill from '../models/Bill.js';
import { assert, oneOf } from '../utils/validation.js';
import { list, send } from '../utils/pagination.js';
export const getBills = async (req, res) => send(res, await list(Bill, {}, req.query, { path: 'appointmentId', populate: { path: 'userId', select: 'name email' } }));
export const getBill = async (req, res) => { const row = await Bill.findById(req.params.id).populate({ path: 'appointmentId', populate: { path: 'userId', select: 'name email' } }); assert(row, 'Bill not found.', 404); send(res, row); };
export async function updateBill(req, res) {
  const bill = await Bill.findById(req.params.id); assert(bill, 'Bill not found.', 404);
  bill.paymentMode = oneOf(req.body.paymentMode, ['Cash', 'UPI', 'Card'], 'payment mode');
  const status = oneOf(req.body.paymentStatus, ['Unpaid', 'Paid'], 'payment status');
  bill.paidAt = status === 'Paid' ? (bill.paidAt || new Date()) : null; bill.paymentStatus = status;
  await bill.save(); send(res, bill, 'Bill updated.');
}
export const deleteBill = async (req, res) => { assert(await Bill.findByIdAndDelete(req.params.id), 'Bill not found.', 404); send(res, null, 'Bill deleted.'); };
