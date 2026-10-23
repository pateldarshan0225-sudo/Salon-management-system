import mongoose from 'mongoose';

export function fail(message, status = 400) {
  const error = new Error(message); error.status = status; throw error;
}
export const assert = (condition, message, status = 400) => { if (!condition) fail(message, status); };
export const text = (value, label, max = 500, required = true) => {
  assert(typeof value === 'string' || (!required && value == null), `${label} must be text.`);
  const result = (value || '').trim();
  assert((!required || result.length > 0) && result.length <= max, `${label} is required and must be at most ${max} characters.`);
  return result;
};
export const email = (value) => {
  const result = text(value, 'Email', 254).toLowerCase();
  assert(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result), 'Enter a valid email address.'); return result;
};
export const phone = (value) => { const result = text(value, 'Phone', 10); assert(/^\d{10}$/.test(result), 'Phone must contain 10 digits.'); return result; };
export const password = (value) => { assert(typeof value === 'string' && value.length >= 8 && Buffer.byteLength(value) <= 72 && /[a-z]/i.test(value) && /\d/.test(value), 'Password must be 8–72 bytes and include a letter and a number.'); return value; };
export const number = (value, label, min = 0, max = 1000000) => { assert((typeof value === 'number' || (typeof value === 'string' && value.trim() !== '')) && Number.isFinite(Number(value)) && Number(value) >= min && Number(value) <= max, `${label} must be between ${min} and ${max}.`); return Number(value); };
export const id = (value, label = 'ID') => { assert(typeof value === 'string' && mongoose.isObjectIdOrHexString(value), `Invalid ${label}.`); return value; };
export const date = (value) => { assert(typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value, 'Enter a valid date (YYYY-MM-DD).'); return value; };
export const time = (value) => { assert(typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value), 'Enter a valid time (HH:mm).'); return value; };
export const boolean = (value) => { assert(typeof value === 'boolean', 'Active must be true or false.'); return value; };
export const url = (value) => {
  if (value == null || value === '') return '';
  const result = text(value, 'Image URL', 2000, false);
  if (!result) return '';
  if (/^\/uploads\/[a-f\d-]{36}\.(png|jpg|webp)$/.test(result)) return result;
  let parsed;
  try { parsed = new URL(result); } catch { fail('Image must be a complete http or https URL.'); }
  assert(['http:', 'https:'].includes(parsed.protocol), 'Image must be an http or https URL.');
  return result;
};
export const oneOf = (value, values, label) => { assert(values.includes(value), `Invalid ${label}.`); return value; };
export function profileInput(body) { return { name: text(body.name, 'Name', 80), email: email(body.email), phone: phone(body.phone), gender: oneOf(body.gender || 'Prefer not to say', ['Female', 'Male', 'Other', 'Prefer not to say'], 'gender') }; }
