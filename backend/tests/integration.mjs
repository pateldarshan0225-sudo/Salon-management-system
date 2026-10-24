// Run with `node tests/integration.mjs`. Uses and removes uniquely named test databases only.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import mongoose from 'mongoose';
import { unlink } from 'node:fs/promises';
import { uploadDirectory } from '../utils/uploads.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const suffix = `${Date.now()}_${process.pid}`;
const database = `salon_management_test_${suffix}`;
const sessionDatabase = `salon_sessions_test_${suffix}`;
const adminPassword = `Test${randomBytes(12).toString('hex')}`;
const origin = 'http://localhost:5173';
const port = 5099;
const env = { ...process.env, NODE_ENV:'test',PORT:String(port),CLIENT_URL:origin,MONGODB_URI:`mongodb://127.0.0.1:27017/${database}`,SESSION_MONGODB_URI:`mongodb://127.0.0.1:27017/${sessionDatabase}`,SESSION_SECRET:randomBytes(32).toString('hex'),BCRYPT_ROUNDS:'4',SEED_ADMIN_NAME:'Integration Admin',SEED_ADMIN_EMAIL:'integration-admin@example.com',SEED_ADMIN_PASSWORD:adminPassword,SESSION_COOKIE_SECURE:'false',SESSION_COOKIE_SAME_SITE:'lax' };
let server; let checks = 0;
const uploadedImages = [];
const pause = ms => new Promise(resolve => setTimeout(resolve,ms));
async function seed() {
  await new Promise((resolve,reject) => { const child = spawn(process.execPath,['scripts/seed.js'],{cwd:root,env,stdio:'pipe',windowsHide:true}); child.on('error',reject); child.on('exit',code => code === 0 ? resolve() : reject(new Error('Test seeding failed.'))); });
}
function client() {
  let cookie = '';
  return async function request(route,method = 'GET',body,expected = 200,requestOrigin = origin) {
    const binary = Buffer.isBuffer(body);
    const response = await fetch(`http://127.0.0.1:${port}/api${route}`,{method,headers:{Origin:requestOrigin,'Content-Type':binary ? 'image/png' : 'application/json',...(cookie ? {Cookie:cookie} : {})},...(body ? {body:binary ? body : JSON.stringify(body)} : {})});
    const header = response.headers.get('set-cookie'); if (header) cookie = header.split(';')[0];
    const result = await response.json(); assert.equal(response.status,expected,`${method} ${route}: ${result.message}`); assert.equal(result.success,expected < 400); assert.ok('data' in result); checks++; return result.data;
  };
}
const user = client(); const other = client(); const admin = client(); const guest = client();
try {
  await seed(); await seed();
  server = spawn(process.execPath,['server.js'],{cwd:root,env,stdio:'pipe',windowsHide:true});
  let ready = false;
  for (let i=0;i<40;i++) { try { if ((await fetch(`http://127.0.0.1:${port}/api/health`)).ok) { ready = true; break; } } catch { /* Server is still starting. */ } await pause(250); }
  assert.ok(ready,'Test API did not start.');
  const categories = await guest('/public/categories?limit=100'); assert.equal(categories.total,6);
  const services = await guest('/public/services?limit=100'); assert.equal(services.total,24);
  const staff = await guest('/public/staff?limit=100'); assert.equal(staff.total,6);
  const offers = await guest('/public/offers'); assert.equal(offers.total,1);
  await guest('/user/profile','GET',null,401);
  await guest('/auth/register','POST',{name:'Bad',email:'bad',phone:'123',password:'abc'},400);
  const values = {name:'Test Customer',email:'customer@example.com',phone:'9876543210',gender:'Other',password:'Customer123'};
  const account = await user('/auth/register','POST',values,201); assert.equal(account.role,'user'); assert.ok(!('password' in account));
  await user('/auth/register','POST',values,409);
  await user('/auth/logout','POST'); assert.equal(await user('/auth/me'),null);
  await user('/auth/login','POST',{email:values.email,password:'wrongpassword1'},401);
  const loggedInUser = await user('/auth/login','POST',{email:values.email,password:values.password,role:'admin'});
  assert.equal(loggedInUser.role,'user','A submitted role must never grant admin access.');
  assert.equal((await user('/auth/me')).email,values.email);
  const profile = await user('/user/profile'); assert.ok(!('password' in profile));
  await user('/user/profile','PUT',{...values,name:'Updated Customer'});
  await user('/admin/dashboard','GET',null,403);
  await user('/user/password','PUT',{currentPassword:values.password,newPassword:'Changed123'});
  await user('/user/profile','PUT',values,403,'https://untrusted.example');
  await admin('/auth/login','POST',{email:env.SEED_ADMIN_EMAIL,password:'WrongPassword123'},401);
  const loggedInAdmin = await admin('/auth/login','POST',{email:env.SEED_ADMIN_EMAIL,password:adminPassword});
  assert.equal(loggedInAdmin.role,'admin');
  assert.equal((await admin('/auth/me')).role,'admin');
  const imageBytes = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aWZkAAAAASUVORK5CYII=','base64');
  await guest('/admin/uploads/images','POST',imageBytes,401);
  await user('/admin/uploads/images','POST',imageBytes,403);
  await admin('/admin/uploads/images','POST',Buffer.from('<svg onload="alert(1)"></svg>'),400);
  await admin('/admin/uploads/images','POST',Buffer.alloc(2*1024*1024+1),413);
  const uploaded = await admin('/admin/uploads/images','POST',imageBytes,201);
  uploadedImages.push(uploaded.image);
  assert.match(uploaded.image,/^\/uploads\/[a-f\d-]{36}\.png$/);
  const servedImage = await fetch(`http://127.0.0.1:${port}${uploaded.image}`);
  assert.equal(servedImage.status,200); assert.equal(servedImage.headers.get('content-type'),'image/png');
  assert.equal(servedImage.headers.get('x-content-type-options'),'nosniff');
  assert.deepEqual(Buffer.from(await servedImage.arrayBuffer()),imageBytes);
  await admin('/user/profile','GET',null,403);
  // Each catalogue status route validates the input, preserves fields and updates public visibility.
  for (const [entity, row] of [['categories',categories.items[0]],['services',services.items[0]],['staff',staff.items[0]],['offers',offers.items[0]]]) {
    await user(`/admin/${entity}/${row._id}/active`,'PATCH',{isActive:false},403);
    await admin(`/admin/${entity}/${row._id}/active`,'PATCH',{isActive:'false'},400);
    await admin(`/admin/${entity}/${row._id}/active`,'PATCH',{},400);
    const disabled = await admin(`/admin/${entity}/${row._id}/active`,'PATCH',{isActive:false});
    assert.equal(disabled.isActive,false); assert.equal(disabled.name || disabled.title,row.name || row.title);
    const publicRows = await guest(`/public/${entity}?limit=100`);
    assert.ok(!publicRows.items.some(item => item._id === row._id));
    const enabled = await admin(`/admin/${entity}/${row._id}/active`,'PATCH',{isActive:true});
    assert.equal(enabled.isActive,true);
    await admin(`/admin/${entity}/not-an-id/active`,'PATCH',{isActive:false},400);
    await admin(`/admin/${entity}/000000000000000000000000/active`,'PATCH',{isActive:false},404);
  }
  const hair = categories.items.find(c => c.name === 'Hair');
  const specialist = staff.items.find(s => s.categoryId._id === hair._id);
  const treatment = services.items.find(s => s.categoryId._id === hair._id && s.duration === 30);
  const now = new Date();
  let date; let starts;
  for (let day=1;day<=7;day++) {
    date = new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(now.getTime()+day*86400000));
    starts = await user(`/user/slots?staffId=${specialist._id}&date=${date}&duration=30`); if (starts.length > 3) break;
  }
  assert.ok(starts.length>3);
  await user('/user/offers/validate','POST',{code:'GLOW15',totalAmount:treatment.price});
  for (const code of ['PAST20','SOON10','MISSING']) await user('/user/offers/validate','POST',{code,totalAmount:1000},400);
  const booking = {serviceIds:[treatment._id],staffId:specialist._id,appointmentDate:date,startTime:starts[0],offerCode:'GLOW15'};
  const appointment = await user('/user/appointments','POST',booking,201);
  assert.equal(appointment.discountAmount,Math.round(treatment.price*.15));
  await user('/user/appointments','POST',booking,409);
  await user('/user/appointments','POST',{...booking,startTime:'23:30'},409);
  await user('/user/appointments','POST',{...booking,appointmentDate:'2020-01-01'},400);
  await user('/user/reviews','POST',{appointmentId:appointment._id,rating:5,comment:'Too early'},400);
  await other('/auth/register','POST',{...values,email:'other@example.com'},201);
  await other(`/user/appointments/${appointment._id}`,'GET',null,403);
  await other(`/user/appointments/${appointment._id}/cancel`,'PUT',{},403);
  await user('/user/appointments/not-an-id','GET',null,400);
  await admin(`/admin/appointments/${appointment._id}/status`,'PUT',{status:'Completed'},400);
  await admin(`/admin/appointments/${appointment._id}/status`,'PUT',{status:'Confirmed'});
  assert.equal((await user(`/user/appointments/${appointment._id}`)).bill,null,'Future confirmed visits must not complete early.');
  await admin(`/admin/appointments/${appointment._id}/status`,'PUT',{status:'Completed'},400);
  const overdueConnection = await mongoose.createConnection(env.MONGODB_URI).asPromise();
  const yesterday = new Date(Date.now()-86400000).toISOString().slice(0,10);
  await overdueConnection.collection('appointments').updateOne({_id:new mongoose.Types.ObjectId(appointment._id)},{$set:{appointmentDate:yesterday}});
  // Do not call an API here: the background timer itself must complete the visit.
  let completedByTimer = false;
  for (let attempt=0;attempt<32;attempt++) {
    const row = await overdueConnection.collection('appointments').findOne({_id:new mongoose.Types.ObjectId(appointment._id)});
    if (row.status === 'Completed') { completedByTimer = true; break; }
    await pause(250);
  }
  assert.ok(completedByTimer,'Background scheduler must complete expired confirmed visits without any API request.');
  await overdueConnection.close();
  const details = await user(`/user/appointments/${appointment._id}`); assert.equal(details.bill.paymentStatus,'Unpaid'); assert.equal(details.services.length,1); assert.ok(!details.appointment.userId.password);
  assert.equal(details.appointment.status,'Completed','Expired confirmed appointments complete automatically.');
  const repeatedDetails = await user(`/user/appointments/${appointment._id}`);
  assert.equal(repeatedDetails.bill._id,details.bill._id,'Repeated completion checks must not duplicate bills.');
  await user(`/user/appointments/${appointment._id}/cancel`,'PUT',{},400);
  await admin(`/admin/appointments/${appointment._id}/status`,'PUT',{status:'Cancelled'},400);
  await admin(`/admin/bills/${details.bill._id}`,'PUT',{paymentMode:'UPI',paymentStatus:'Paid'});
  const bill = await admin(`/admin/bills/${details.bill._id}`); assert.ok(bill.paidAt);
  const review = await user('/user/reviews','POST',{appointmentId:appointment._id,rating:5,comment:'A wonderful calm visit.'},201);
  await user('/user/reviews','POST',{appointmentId:appointment._id,rating:4,comment:'Duplicate'},409);
  await other(`/user/reviews/${review._id}`,'PUT',{rating:1,comment:'Unauthorized'},403);
  await user(`/user/reviews/${review._id}`,'PUT',{rating:4,comment:'Thoughtful care.'});
  const testimonials = await guest('/public/reviews'); assert.equal(testimonials.total,1); assert.deepEqual(Object.keys(testimonials.items[0].userId).sort(),['_id','name']);
  await admin(`/admin/services/${treatment._id}`,'DELETE',null,409);
  await admin(`/admin/categories/${hair._id}`,'DELETE',null,409);
  await admin(`/admin/staff/${specialist._id}`,'DELETE',null,409);
  await admin(`/admin/offers/${offers.items[0]._id}`,'DELETE',null,409);
  const cancelBooking = await user('/user/appointments','POST',{...booking,startTime:starts[1],staffId:'any'},201);
  await user(`/user/appointments/${cancelBooking._id}/cancel`,'PUT',{});
  // Directly set a near start to verify the two-hour API rule, without changing the clock.
  const connection = await mongoose.createConnection(env.MONGODB_URI).asPromise();
  const soon = new Date(Date.now()+60*60000); const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(soon).map(p=>[p.type,p.value]));
  await connection.collection('appointments').updateOne({_id:new mongoose.Types.ObjectId(cancelBooking._id)},{$set:{status:'Pending',appointmentDate:`${parts.year}-${parts.month}-${parts.day}`,startTime:`${parts.hour}:${parts.minute}`}});
  await user(`/user/appointments/${cancelBooking._id}/cancel`,'PUT',{},400);
  await admin(`/admin/appointments/${cancelBooking._id}/status`,'PUT',{status:'Cancelled'});
  // Two simultaneous requests for the same free interval must produce one success.
  const concurrentBody = {...booking,startTime:starts[3],offerCode:undefined};
  const result = await Promise.allSettled([user('/user/appointments','POST',concurrentBody,201),other('/user/appointments','POST',concurrentBody,201)]);
  assert.equal(result.filter(r=>r.status==='fulfilled').length,1);
  const newCategory = await admin('/admin/categories','POST',{name:'Temporary',description:'Test',image:uploaded.image,isActive:true},201);
  assert.equal(newCategory.image,uploaded.image);
  await admin('/admin/categories','POST',{name:'Temporary',isActive:true},409);
  await admin('/admin/categories','POST',{name:'  ',isActive:true},400);
  await admin('/admin/categories','POST',{name:'Invalid image',image:'https://',isActive:true},400);
  await admin(`/admin/categories/${newCategory._id}`,'PUT',{name:'Temporary updated',description:'Test',image:'',isActive:false});
  const newService = await admin('/admin/services','POST',{name:'Temporary Service',categoryId:newCategory._id,price:100,duration:30,isActive:true,image:uploaded.image},201);
  assert.equal(newService.image,uploaded.image);
  for (const change of [{price:0},{price:true},{duration:1.5},{categoryId:'bad'}]) await admin('/admin/services','POST',{name:'Invalid',categoryId:newCategory._id,price:100,duration:30,isActive:true,...change},400);
  await admin(`/admin/services/${newService._id}`,'PUT',{name:'Changed Service',categoryId:newCategory._id,price:200,duration:60,isActive:false});
  await admin(`/admin/services/${newService._id}`,'DELETE');
  const newStaff = await admin('/admin/staff','POST',{name:'Temporary Staff',serviceId:treatment._id,phone:'9999999999',experienceYears:2,workingDays:['Mon'],startTime:'09:00',endTime:'18:00',isActive:true,image:uploaded.image},201);
  assert.equal(newStaff.serviceId,treatment._id);
  assert.equal(newStaff.categoryId,treatment.categoryId._id);
  const specialistDetail = await admin(`/admin/staff/${newStaff._id}`);
  assert.equal(specialistDetail.serviceId.name,treatment.name);
  await admin('/admin/staff','POST',{...newStaff,serviceId:''},400);
  await admin('/admin/staff','POST',{...newStaff,serviceId:'000000000000000000000000'},400);
  const differentTreatment = services.items.find(s => s.categoryId._id === hair._id && s._id !== treatment._id);
  const monday = Array.from({length:14},(_,i)=>new Date(Date.now()+(i+1)*86400000)).find(d=>d.getUTCDay()===1).toISOString().slice(0,10);
  const matchingSlots = await user(`/user/slots?staffId=${newStaff._id}&serviceId=${treatment._id}&date=${monday}&duration=${treatment.duration}`);
  assert.ok(matchingSlots.length>0);
  assert.deepEqual(await user(`/user/slots?staffId=${newStaff._id}&serviceId=${differentTreatment._id}&date=${monday}&duration=${differentTreatment.duration}`),[]);
  await user('/user/appointments','POST',{serviceIds:[differentTreatment._id],staffId:newStaff._id,appointmentDate:monday,startTime:matchingSlots[0]},409);
  assert.equal(newStaff.image,uploaded.image);
  for (const change of [{phone:'123'},{experienceYears:61},{workingDays:[]},{endTime:'08:00'}]) await admin('/admin/staff','POST',{...newStaff,categoryId:newCategory._id,...change},400);
  await admin(`/admin/staff/${newStaff._id}`,'PUT',{...newStaff,categoryId:newCategory._id,bio:'Changed'});
  await admin(`/admin/staff/${newStaff._id}`,'DELETE');
  await admin(`/admin/categories/${newCategory._id}`,'DELETE');
  const newOffer = await admin('/admin/offers','POST',{title:'Temporary Offer',code:'TEST5',discountPercent:5,validFrom:'2026-01-01',validTo:'2027-01-01',isActive:true},201);
  await admin('/admin/offers','POST',{...newOffer},409);
  for (const change of [{code:'BAD CODE'},{discountPercent:91},{validTo:'2025-01-01'},{validFrom:'2026-02-30'}]) await admin('/admin/offers','POST',{...newOffer,code:'UNUSED',...change},400);
  await admin(`/admin/offers/${newOffer._id}`,'PUT',{...newOffer,discountPercent:10}); await admin(`/admin/offers/${newOffer._id}`,'DELETE');
  const dashboard = await admin('/admin/dashboard'); assert.equal(dashboard.totalRevenue,bill.finalAmount);
  const stats = await guest('/public/stats'); assert.equal(stats.happyCustomers,2); assert.equal(stats.completedAppointments,1);
  assert.equal((await guest('/public/services?sort=price&maxPrice=500&limit=2')).items.length,2);
  assert.equal((await admin('/admin/users')).total,2);
  assert.equal((await admin('/admin/reviews')).total,1);
  assert.equal((await admin('/admin/bills')).total,1);
  assert.equal((await connection.db.listCollections().toArray()).length,10);
  await user('/user/reviews','DELETE',{id:review._id});
  const secondReview = await user('/user/reviews','POST',{appointmentId:appointment._id,rating:5,comment:'Another review after deletion.'},201);
  await admin(`/admin/reviews/${secondReview._id}`,'DELETE');
  await admin(`/admin/bills/${bill._id}`,'DELETE');
  await user('/user/profile','DELETE'); assert.equal(await user('/auth/me'),null);
  assert.equal(await connection.collection('appointments').countDocuments({userId:new mongoose.Types.ObjectId(account.id)}),0);
  assert.equal(await connection.collection('appointmentServices').countDocuments({appointmentId:new mongoose.Types.ObjectId(appointment._id)}),0);
  const otherAccount = await other('/auth/me'); await admin(`/admin/users/${otherAccount.id}`,'DELETE'); await other('/user/profile','GET',null,401);
  await admin('/auth/logout','POST'); await admin('/admin/dashboard','GET',null,401);
  await connection.close();
  console.log(`PASS: ${checks} API assertions, idempotent seed, ten collections, concurrency and cascade checks.`);
} catch(error) { console.error(error.message); process.exitCode = 1; }
finally {
  if (server) { server.kill(); await pause(500); }
  for (const image of uploadedImages) await unlink(path.join(uploadDirectory,path.basename(image)));
  for (const name of [database,sessionDatabase]) {
    assert.match(name,/^salon_(management|sessions)_test_\d+_\d+$/);
    const connection = await mongoose.createConnection(`mongodb://127.0.0.1:27017/${name}`,{serverSelectionTimeoutMS:3000}).asPromise();
    await connection.dropDatabase(); await connection.close();
  }
}
