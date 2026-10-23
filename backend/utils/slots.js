import { assert, date, time } from './validation.js';

// Salon clock is always Asia/Kolkata, independent of the server timezone.
export function clock(now = new Date()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(now).map(p => [p.type, p.value]));
  return { date: `${parts.year}-${parts.month}-${parts.day}`, time: `${parts.hour}:${parts.minute}` };
}
export const minutes = (value) => { time(value); const [h, m] = value.split(':').map(Number); return h * 60 + m; };
export const timeString = (value) => `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`;
export const overlaps = (start, end, otherStart, otherEnd) => start < otherEnd && end > otherStart;
export function checkBookingDate(value, now = new Date()) {
  date(value); const today = clock(now).date;
  const difference = (Date.parse(value) - Date.parse(today)) / 86400000;
  assert(difference >= 0 && difference <= 30, 'Choose a date from today through the next 30 days.');
}
export function availableSlots(staff, value, duration, appointments = [], now = new Date()) {
  checkBookingDate(value, now);
  assert(Number.isInteger(duration) && duration > 0 && duration <= 1440, 'Duration must be a positive whole number of minutes.');
  const day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date(`${value}T12:00:00Z`).getUTCDay()];
  if (!staff.isActive || !staff.workingDays.includes(day)) return [];
  const today = clock(now); const result = [];
  for (let start = minutes(staff.startTime); start + duration <= minutes(staff.endTime); start += 30) {
    if (value === today.date && start <= minutes(today.time)) continue;
    if (!appointments.some(a => ['Pending', 'Confirmed'].includes(a.status) && overlaps(start, start + duration, minutes(a.startTime), minutes(a.endTime)))) result.push(timeString(start));
  }
  return result;
}
export function canCancel(appointment, now = new Date()) {
  return new Date(`${appointment.appointmentDate}T${appointment.startTime}:00+05:30`).getTime() - now.getTime() >= 7200000;
}

// Serialize booking/status operations in this single Node server to avoid concurrent slot races.
// For a multi-process deployment use database transactions with a shared staff lock.
let queue = Promise.resolve();
export async function withBookingLock(task) {
  const previous = queue; let release;
  queue = new Promise(resolve => { release = resolve; });
  await previous;
  try { return await task(); } finally { release(); }
}
