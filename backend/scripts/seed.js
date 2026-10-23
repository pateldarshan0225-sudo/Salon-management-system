import '../config/db.js';
import { connectDB } from '../config/db.js';
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import Admin from '../models/Admin.js';
import Category from '../models/ServiceCategory.js';
import Service from '../models/Service.js';
import Staff from '../models/Staff.js';
import Offer from '../models/Offer.js';
import { email, password, assert } from '../utils/validation.js';
import { clock } from '../utils/slots.js';
import { seedDemoData } from './demoData.js';

const photo = (id) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=900&q=80`;
const images = [photo('photo-1562322140-8baeececf3df'), photo('photo-1570172619644-dfd03ed5d881'), photo('photo-1604654894610-df63bc536371'), photo('photo-1540555700478-4be289fbecef'), photo('photo-1487412947147-5cebf100ffc2'), photo('photo-1503951914875-452162b0f3f1')];
const groups = [
  ['Hair', 'Healthy hair, thoughtful cuts and fresh colour.', [['Signature Haircut', 650, 30], ['Hair Spa Ritual', 1200, 60], ['Global Hair Colour', 3200, 120], ['Smooth & Shine Styling', 900, 45]]],
  ['Skin & Facial', 'Restorative care for a natural, healthy glow.', [['Botanical Glow Facial', 1500, 60], ['Deep Cleansing Facial', 1200, 60], ['Hydration Therapy', 1800, 75], ['Express Skin Refresh', 750, 30]]],
  ['Nails', 'Little details, beautifully finished.', [['Classic Manicure', 550, 30], ['Spa Pedicure', 950, 60], ['Gel Nail Finish', 1100, 60], ['Nail Art Session', 800, 45]]],
  ['Spa & Massage', 'A quieter moment for mind and body.', [['Aromatherapy Massage', 2200, 60], ['Deep Tissue Massage', 2600, 90], ['Head & Shoulder Release', 850, 30], ['Full Body Renewal', 3500, 120]]],
  ['Bridal & Makeup', 'Feel like yourself on your most special days.', [['Occasion Makeup', 2500, 60], ['Bridal Makeup Trial', 3500, 90], ['Bridal Signature Look', 8000, 120], ['Elegant Hair Updo', 1500, 60]]],
  ["Men's Grooming", 'Refined grooming, made personal.', [["Men's Precision Cut", 450, 30], ['Beard Shape & Finish', 350, 30], ['Grooming Refresh', 1200, 60], ['Scalp Care Ritual', 1000, 45]]],
];
async function seed() {
  await connectDB();
  const adminEmail = email(process.env.SEED_ADMIN_EMAIL); password(process.env.SEED_ADMIN_PASSWORD); assert(process.env.SEED_ADMIN_NAME, 'SEED_ADMIN_NAME is required.');
  // Ordinary seeding preserves credentials; explicit sync applies the current environment settings.
  const existingAdmin = await Admin.exists({ email: adminEmail });
  if (!existingAdmin || process.argv.includes('--sync-admin')) {
    await Admin.findOneAndUpdate({ email: adminEmail }, { $set: { name: process.env.SEED_ADMIN_NAME, password: await bcrypt.hash(process.env.SEED_ADMIN_PASSWORD, Number(process.env.BCRYPT_ROUNDS) || 12), role: 'admin' } }, { upsert: true, runValidators: true });
  }
  for (let index = 0; index < groups.length; index++) {
    const [name, description, services] = groups[index];
    const category = await Category.findOneAndUpdate({ name }, { $setOnInsert: { name, description, image: images[index], isActive: true } }, { upsert: true, new: true });
    for (const [serviceName, price, duration] of services) await Service.updateOne({ name: serviceName, categoryId: category._id }, { $setOnInsert: { name: serviceName, categoryId: category._id, price, duration, description: `${serviceName} is a personalised treatment combining professional care with a calm, unhurried experience. Your specialist will discuss your preferences before beginning.`, image: images[index], isActive: true } }, { upsert: true });
    const staffName = ['Ananya Sharma', 'Meera Kapoor', 'Riya Patel', 'Arjun Nair', 'Priya Shah', 'Kabir Singh'][index];
    await Staff.updateOne({ name: staffName }, { $setOnInsert: { name: staffName, phone: `987650000${index}`, categoryId: category._id, experienceYears: index + 3, bio: 'Thoughtful, personalised care with a focus on comfort and beautiful results.', image: photo(['photo-1580489944761-15a19d654956','photo-1594744803329-e58b31de8bf5','photo-1534528741775-53994a69daeb','photo-1500648767791-00dcc994a43e','photo-1531123897727-8f129e1688ce','photo-1506794778202-cad84cf45f1d'][index]), workingDays: index % 2 ? ['Mon','Tue','Wed','Thu','Fri','Sat'] : ['Tue','Wed','Thu','Fri','Sat','Sun'], startTime: index % 2 ? '10:00' : '09:00', endTime: index % 2 ? '19:00' : '18:00', isActive: true } }, { upsert: true });
  }
  const today = clock().date;
  const day = offset => new Date(Date.parse(today) + offset * 86400000).toISOString().slice(0, 10);
  for (const offer of [
    { title: 'A little time for you', code: 'GLOW15', discountPercent: 15, validFrom: day(-1), validTo: day(60), isActive: true, description: 'Enjoy 15% off your next moment of self care.' },
    { title: 'Past season special', code: 'PAST20', discountPercent: 20, validFrom: day(-60), validTo: day(-1), isActive: true, description: 'An expired offer for validation demonstrations.' },
    { title: 'Members preview', code: 'SOON10', discountPercent: 10, validFrom: day(-1), validTo: day(60), isActive: false, description: 'An inactive offer for validation demonstrations.' },
  ]) await Offer.updateOne({ code: offer.code }, { $setOnInsert: offer }, { upsert: true });
  console.log('Seed complete: admin, 6 categories, 24 services, 6 specialists, 3 offers. Existing records preserved.');
  if (process.argv.includes('--demo')) await seedDemoData();
}
try { await seed(); } catch (error) { console.error(error.status ? error.message : 'Seed failed. Check environment settings and MongoDB availability.'); process.exitCode = 1; } finally { await mongoose.disconnect(); }
