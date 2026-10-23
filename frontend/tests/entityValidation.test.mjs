import test from 'node:test';
import assert from 'node:assert/strict';
import { validateEntity, entityPayload, validateImageFile } from '../src/utils/entityValidation.js';
const categoryId = '0123456789abcdef01234567';
const service = { name:'Cut',categoryId,price:'0.50',duration:'30',description:'',image:'',isActive:true };
const staff = { name:'Specialist',phone:'9876543210',categoryId,experienceYears:'0',workingDays:['Mon'],startTime:'09:00',endTime:'18:00',bio:'',image:'',isActive:false };
const offer = { title:'New offer',code:'glow15',discountPercent:'15',validFrom:'2026-10-01',validTo:'2026-10-31',description:'',isActive:true };
test('required category name rejects whitespace and enforces maximum length', () => {
  assert.ok(validateEntity('categories',{name:'   ',isActive:true}).name);
  assert.ok(validateEntity('categories',{name:'x'.repeat(81),isActive:true}).name);
  assert.deepEqual(validateEntity('categories',{name:'Hair',isActive:false}),{});
});
test('optional URLs must be complete http(s) URLs', () => {
  for (const image of ['https://','bad','javascript:alert(1)']) assert.ok(validateEntity('services',{...service,image}).image);
  assert.deepEqual(validateEntity('services',{...service,image:'https://example.com/a.jpg'}),{});
});
test('image files enforce type and size while existing local uploads remain editable', () => {
  assert.ok(validateImageFile({type:'image/svg+xml',size:100}));
  assert.ok(validateImageFile({type:'image/png',size:0}));
  assert.ok(validateImageFile({type:'image/png',size:2*1024*1024+1}));
  assert.equal(validateImageFile({type:'image/webp',size:100}), '');
  assert.deepEqual(validateEntity('services',{...service,image:'/uploads/12345678-abcd-1234-abcd-123456789abc.png'}),{});
  assert.ok(validateEntity('services',{...service,image:'/uploads/../secret'}).image);
});
test('service accepts fractional INR prices and rejects empty, negative, huge or nonnumeric values', () => {
  assert.deepEqual(validateEntity('services',service),{});
  for (const price of ['', ' ', -1, 0, 1000001, true, 'NaN']) assert.ok(validateEntity('services',{...service,price}).price);
  for (const duration of [0,2.5,1441]) assert.ok(validateEntity('services',{...service,duration}).duration);
  assert.ok(validateEntity('services',{...service,categoryId:''}).categoryId);
});
test('staff needs ten digits, at least one working day, and sensible hours', () => {
  assert.deepEqual(validateEntity('staff',staff),{});
  assert.ok(validateEntity('staff',{...staff,phone:'123'}).phone);
  assert.ok(validateEntity('staff',{...staff,workingDays:[]}).workingDays);
  assert.ok(validateEntity('staff',{...staff,workingDays:['Bad']}).workingDays);
  assert.ok(validateEntity('staff',{...staff,endTime:'08:00'}).endTime);
  assert.ok(validateEntity('staff',{...staff,startTime:'24:00'}).startTime);
  assert.ok(validateEntity('staff',{...staff,experienceYears:61}).experienceYears);
});
test('offer validates percent, real calendar dates, order and allowed codes', () => {
  assert.deepEqual(validateEntity('offers',offer),{});
  for (const discountPercent of [0,91,'']) assert.ok(validateEntity('offers',{...offer,discountPercent}).discountPercent);
  assert.ok(validateEntity('offers',{...offer,validFrom:'2026-02-30'}).validFrom);
  assert.ok(validateEntity('offers',{...offer,validTo:'2026-09-30'}).validTo);
  assert.ok(validateEntity('offers',{...offer,code:'BAD CODE'}).code);
  assert.deepEqual(validateEntity('offers',{...offer,validTo:offer.validFrom}),{});
});
test('payload trims text, normalizes code, preserves false, and omits database fields', () => {
  const payload = entityPayload('offers',{...offer,title:' New offer ',_id:'ignored',code:' glow15 ',isActive:false});
  assert.equal(payload.title,'New offer'); assert.equal(payload.code,'GLOW15'); assert.equal(payload.discountPercent,15); assert.equal(payload.isActive,false); assert.ok(!('_id' in payload));
});
