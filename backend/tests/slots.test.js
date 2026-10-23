import test from 'node:test';
import assert from 'node:assert/strict';
import { availableSlots, overlaps, minutes, timeString, canCancel, clock, checkBookingDate, withBookingLock } from '../utils/slots.js';
import * as validation from '../utils/validation.js';

const now = new Date('2026-10-23T05:00:00Z'); // 10:30 IST, Friday
const staff = { isActive:true,workingDays:['Fri','Sat'],startTime:'09:00',endTime:'18:00' };
test('salon clock uses India time even across UTC midnight', () => {
  assert.deepEqual(clock(new Date('2026-10-22T20:00:00Z')), { date:'2026-10-23',time:'01:30' });
});
test('time conversions and half-open overlap allow back-to-back visits', () => {
  assert.equal(minutes('09:30'),570); assert.equal(timeString(615),'10:15');
  assert.equal(overlaps(540,600,600,660),false); assert.equal(overlaps(540,601,600,660),true);
});
test('today excludes past and current slots; appointment must finish by closing', () => {
  const slots = availableSlots(staff,'2026-10-23',60,[],now);
  assert.equal(slots[0],'11:00'); assert.equal(slots.at(-1),'17:00'); assert.equal(slots.includes('17:30'),false);
});
test('tomorrow includes opening time, and starts repeat every 30 minutes', () => {
  assert.deepEqual(availableSlots({...staff,endTime:'11:00'},'2026-10-24',60,[],now),['09:00','09:30','10:00']);
});
test('pending and confirmed appointments block any overlapping duration', () => {
  const appointments = [{startTime:'11:00',endTime:'12:00',status:'Pending'},{startTime:'14:00',endTime:'15:30',status:'Confirmed'}];
  const slots = availableSlots(staff,'2026-10-24',90,appointments,now);
  assert.equal(slots.includes('10:00'),false); assert.equal(slots.includes('12:00'),true); assert.equal(slots.includes('13:00'),false); assert.equal(slots.includes('15:30'),true);
});
test('cancelled and completed appointments do not reserve slots', () => {
  for (const status of ['Cancelled','Completed']) assert.equal(availableSlots(staff,'2026-10-24',60,[{startTime:'09:00',endTime:'18:00',status}],now).length,17);
});
test('inactive specialists and non-working days have no availability', () => {
  assert.deepEqual(availableSlots({...staff,isActive:false},'2026-10-24',30,[],now),[]);
  assert.deepEqual(availableSlots(staff,'2026-10-25',30,[],now),[]);
});
test('valid range includes day 30 and rejects past dates, day 31 and malformed dates', () => {
  assert.doesNotThrow(() => checkBookingDate('2026-11-22',now));
  for (const value of ['2026-10-22','2026-11-23','2026-02-30','bad']) assert.throws(() => checkBookingDate(value,now));
});
test('invalid duration/time are rejected and too-long treatments have no slots', () => {
  for (const duration of [0,-1,2.5,1441]) assert.throws(() => availableSlots(staff,'2026-10-24',duration,[],now));
  assert.deepEqual(availableSlots(staff,'2026-10-24',600,[],now),[]);
  for (const value of ['24:00','10:60','9:00']) assert.throws(() => minutes(value));
});
test('customer cancellation permits exactly two hours and rejects one minute less', () => {
  assert.equal(canCancel({appointmentDate:'2026-10-23',startTime:'12:30'},now),true);
  assert.equal(canCancel({appointmentDate:'2026-10-23',startTime:'12:29'},now),false);
});
test('booking lock serializes concurrent requests and releases after failures', async () => {
  const events = [];
  const first = withBookingLock(async () => { events.push(1); await new Promise(resolve => setTimeout(resolve,10)); events.push(2); });
  const second = withBookingLock(async () => { events.push(3); });
  await Promise.all([first,second]); assert.deepEqual(events,[1,2,3]);
  await assert.rejects(withBookingLock(async () => { throw new Error('expected'); }));
  assert.equal(await withBookingLock(async () => 'released'),'released');
});
test('input validation rejects malformed or unsafe request shapes', () => {
  assert.equal(validation.email(' Guest@Example.COM '),'guest@example.com');
  for (const value of ['123',{},null]) assert.throws(() => validation.phone(value));
  for (const value of ['onlyletters','12345678','short1','é'.repeat(40)+'a1']) assert.throws(() => validation.password(value));
  assert.doesNotThrow(() => validation.password('Healthy123'));
  for (const value of ['',{},-1,'NaN',Infinity]) assert.throws(() => validation.number(value,'Price',0.01));
  assert.throws(() => validation.id({$ne:null})); assert.throws(() => validation.url('javascript:alert(1)'));
  assert.throws(() => validation.boolean('false'));
});
