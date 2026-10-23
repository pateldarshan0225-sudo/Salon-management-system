import bcrypt from 'bcrypt';
import { createHash } from 'node:crypto';
import User from '../models/User.js';
import Service from '../models/Service.js';
import Staff from '../models/Staff.js';
import Category from '../models/ServiceCategory.js';
import Appointment from '../models/Appointment.js';
import AppointmentService from '../models/AppointmentService.js';
import Bill from '../models/Bill.js';
import Review from '../models/Review.js';
import Offer from '../models/Offer.js';
import { clock, minutes, timeString, overlaps, availableSlots } from '../utils/slots.js';

// Synthetic customers only: reserved example.com addresses, no real customer data.
const customers = [
  ['Aditi Deshmukh','aditi','Female'], ['Rohan Mehta','rohan','Male'],
  ['Sneha Kulkarni','sneha','Female'], ['Vikram Joshi','vikram','Male'],
  ['Neha Shah','neha','Female'], ['Aarav Patil','aarav','Male'],
  ['Isha Rao','isha','Female'], ['Dev Malhotra','dev','Male'],
  ['Anjali Verma','anjali','Female'], ['Kunal Bhat','kunal','Male'],
  ['Pooja Nair','pooja','Female'], ['Siddharth Jain','siddharth','Male'],
  ['Tanvi More','tanvi','Female'], ['Nikhil Sen','nikhil','Male'],
  ['Maya Dutta','maya','Female'], ['Rahul Sethi','rahul','Male'],
  ['Kavya Iyer','kavya','Female'], ['Aditya Menon','aditya','Male'],
  ['Sana Khan','sana','Female'], ['Yash Gupta','yash','Male'],
];
const comments = [
  'The specialist listened to my preferences and explained the treatment clearly. A relaxing visit.',
  'Clean space, a comfortable appointment and a lovely result. I would book again.',
  'Everything started on time and the care felt personal. Very happy with my visit.',
  'I appreciated the clear prices and the attention to detail throughout the treatment.',
  'A peaceful break from a busy week. The team made me feel welcome.',
  'Professional service and helpful advice for looking after the results at home.',
];
const demoId = index => createHash('sha256').update(`salon-demo-v1-appointment-${index}`).digest('hex').slice(0,24);

export async function seedDemoData() {
  const today = clock().date;
  const day = offset => new Date(Date.parse(today) + offset * 86400000).toISOString().slice(0,10);
  const hash = await bcrypt.hash('SalonDemo123', Number(process.env.BCRYPT_ROUNDS) || 12);
  const users = [];
  for (const [index,[name,handle,gender]] of customers.entries()) {
    users.push(await User.findOneAndUpdate({ email:`${handle}.demo@example.com` }, { $setOnInsert:{ name,phone:`900000${1000+index}`,gender,password:hash } }, { upsert:true,new:true,runValidators:true }));
  }
  const offer = await Offer.findOneAndUpdate({ code:'DEMO10' }, { $setOnInsert:{ title:'Wellness Welcome',code:'DEMO10',discountPercent:10,validFrom:day(-90),validTo:day(90),isActive:true,description:'A demonstration offer for testing appointment discounts.' } }, { upsert:true,new:true });
  const activeCategories = await Category.find({ isActive:true }).sort({ name:1 });
  const extras = [
    ['Hair','Sana Bendre',[['Root Touch-Up',1600,60],['Scalp Detox',1400,60]]],
    ['Skin & Facial','Diya Thomas',[['Vitamin C Radiance Facial',2100,75],['Sensitive Skin Soothing Facial',1700,60]]],
    ['Nails','Tara Sinha',[['French Manicure',850,45],['Heel Repair Pedicure',1250,60]]],
    ['Spa & Massage','Rehan Ali',[['Hot Stone Massage',2900,90],['Foot Reflexology',1350,45]]],
    ['Bridal & Makeup','Avni Mishra',[['Party Glam Makeup',3200,90],['Engagement Styling',4500,120]]],
    ["Men's Grooming",'Dhruv Kapoor',[['Luxury Shave Ritual',650,30],['Groom Facial & Cleanup',1500,60]]],
  ];
  for (const [index,[name,staffName,treatments]] of extras.entries()) {
    const category = activeCategories.find(c=>c.name===name); if (!category) continue;
    for (const [serviceName,price,duration] of treatments) await Service.updateOne({ name:serviceName,categoryId:category._id }, { $setOnInsert:{ name:serviceName,categoryId:category._id,price,duration,image:category.image,description:'A personalised salon treatment with a consultation and attentive professional care.',isActive:true } }, { upsert:true,runValidators:true });
    await Staff.updateOne({ name:staffName }, { $setOnInsert:{ name:staffName,phone:`900001200${index}`,categoryId:category._id,experienceYears:4+index,bio:'An experienced specialist offering tailored consultations and thoughtful care.',image:'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=600&q=80',workingDays:['Mon','Tue','Wed','Thu','Fri','Sat','Sun'],startTime:'10:00',endTime:'19:00',isActive:true } }, { upsert:true,runValidators:true });
  }
  for (const [code,title,discountPercent] of [['DEMO20','Seasonal Spa Escape',20],['WEEKDAY12','Everyday Glow',12]]) await Offer.updateOne({ code }, { $setOnInsert:{ code,title,discountPercent,validFrom:day(-1),validTo:day(90),isActive:true,description:'A synthetic promotion for testing salon offers and discounts.' } }, { upsert:true,runValidators:true });
  const specialists = await Staff.find({ isActive:true,categoryId:{ $in:activeCategories.map(c=>c._id) } }).sort({ name:1 });
  let added = 0; let skipped = 0;
  for (let index=0;index<72;index++) {
    const existing = await Appointment.findById(demoId(index));
    if (existing) { skipped++; continue; }
    if (!specialists.length) break;
    const staff = specialists[index % specialists.length];
    const services = await Service.find({ categoryId:staff.categoryId,isActive:true }).sort({ duration:1,name:1 }).limit(index % 3 === 0 ? 2 : 1);
    if (!services.length) { skipped++; continue; }
    const duration = services.reduce((sum,s)=>sum+s.duration,0);
    const subtotal = services.reduce((sum,s)=>sum+s.price,0);
    const status = index<24 ? (index<12 ? 'Completed' : index<16 ? 'Pending' : index<20 ? 'Confirmed' : 'Cancelled') : ['Completed','Completed','Completed','Pending','Confirmed','Cancelled'][index%6];
    let appointmentDate; let startTime;
    // Respect existing visits and specialist working days instead of forcing conflicting slots.
    for (let attempt=0;attempt<28;attempt++) {
      const offset = status === 'Completed' ? -(index+1+attempt) : index===12 && attempt===0 ? 0 : 1+(index%7)+attempt;
      if (offset>30) break;
      const date = day(offset);
      const weekday = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][new Date(`${date}T12:00:00Z`).getUTCDay()];
      if (!staff.workingDays.includes(weekday)) continue;
      const existingVisits = await Appointment.find({ staffId:staff._id,appointmentDate:date,status:{ $ne:'Cancelled' } });
      let slots;
      if (offset>=0) slots = availableSlots(staff,date,duration,existingVisits);
      else {
        slots=[];
        for (let start=minutes(staff.startTime);start+duration<=minutes(staff.endTime);start+=30) {
          if (!existingVisits.some(a=>overlaps(start,start+duration,minutes(a.startTime),minutes(a.endTime)))) slots.push(timeString(start));
        }
      }
      if (slots.length) { appointmentDate=date;startTime=slots[Math.min(index%3,slots.length-1)];break; }
    }
    if (!appointmentDate) { skipped++;continue; }
    const discounted = index%2===0 && offer.isActive && appointmentDate>=offer.validFrom && appointmentDate<=offer.validTo;
    const discount = discounted ? Math.round(subtotal*offer.discountPercent/100) : 0;
    const createdAt = new Date(`${status==='Completed' ? appointmentDate : today}T08:00:00+05:30`);
    const appointment = await Appointment.create({ _id:demoId(index),userId:users[index<24 ? index%8 : (index-24)%users.length]._id,staffId:staff._id,appointmentDate,startTime,endTime:timeString(minutes(startTime)+duration),totalDuration:duration,totalAmount:subtotal,offerId:discounted?offer._id:null,discountAmount:discount,status,notes:`Demo test appointment ${String(index+1).padStart(2,'0')} — synthetic data for college project testing.`,createdAt });
    await AppointmentService.insertMany(services.map(s=>({appointmentId:appointment._id,serviceId:s._id,price:s.price,duration:s.duration})));
    if (status==='Completed') {
      const paid = index<24 ? index<9 : index%4!==0;
      await Bill.create({appointmentId:appointment._id,subtotal,discount,finalAmount:subtotal-discount,paymentMode:['Cash','UPI','Card'][index%3],paymentStatus:paid?'Paid':'Unpaid',paidAt:paid?new Date(`${appointmentDate}T${appointment.endTime}:00+05:30`):null,createdAt});
      if (index<8 || (index>=24 && index%3!==2)) await Review.create({userId:appointment.userId,appointmentId:appointment._id,rating:index%3===0?4:5,comment:`${comments[index%comments.length]} (Demo review)`,createdAt:new Date(`${appointmentDate}T20:00:00+05:30`)});
    }
    added++;
  }
  console.log(`Demo data ready: ${users.length} demo customers; ${added} appointments added, ${skipped} existing/unavailable appointments preserved. Completed visits include bills and clearly labelled demo reviews.`);
}
