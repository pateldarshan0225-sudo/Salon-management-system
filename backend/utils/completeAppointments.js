import Appointment from '../models/Appointment.js';
import Bill from '../models/Bill.js';
import { clock, withBookingLock } from './slots.js';
// Complete only confirmed visits, using the salon's India time.
export async function completeDueAppointments(now = new Date()) {
  return withBookingLock(async () => {
    const current = clock(now);
    const due = await Appointment.find({ status:'Confirmed', $or:[{ appointmentDate:{ $lt:current.date } },{ appointmentDate:current.date,endTime:{ $lte:current.time } }] });
    for (const appointment of due) {
      // Create the bill first; retrying an interrupted run cannot duplicate it.
      await Bill.updateOne({ appointmentId:appointment._id }, { $setOnInsert:{ subtotal:appointment.totalAmount,discount:appointment.discountAmount,finalAmount:appointment.totalAmount-appointment.discountAmount,paymentStatus:'Unpaid',paymentMode:'Cash' } }, { upsert:true,runValidators:true });
      appointment.status='Completed'; await appointment.save();
    }
    return due.length;
  });
}
export function startCompletionTimer() {
  const timer=setInterval(()=>completeDueAppointments().catch(()=>console.error('Automatic completion failed; retrying on the next check.')),5000);
  timer.unref(); return timer;
}
