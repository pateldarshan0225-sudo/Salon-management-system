export const entityConfigs = {
  categories: { title:'Categories', singular:'Category', fields:[['name','Name','text',80],['description','Description','textarea',2000],['image','Upload image','image'],['isActive','Active','checkbox']] },
  services: { title:'Services', singular:'Service', fields:[['name','Name','text',100],['categoryId','Category','category'],['price','Price (₹)','number'],['duration','Duration (minutes)','number'],['description','Description','textarea',3000],['image','Upload image','image'],['isActive','Active','checkbox']] },
  staff: { title:'Staff', singular:'Specialist', fields:[['name','Name','text',80],['phone','Phone number','tel',10],['categoryId','Specialization','category'],['experienceYears','Experience (years)','number'],['bio','Bio','textarea',2000],['image','Upload image','image'],['workingDays','Working days','days'],['startTime','Start time','time'],['endTime','End time','time'],['isActive','Active','checkbox']] },
  offers: { title:'Offers', singular:'Offer', fields:[['title','Title','text',100],['code','Offer code','text',30],['discountPercent','Discount (%)','number'],['validFrom','Valid from','date'],['validTo','Valid to','date'],['description','Description','textarea',2000],['isActive','Active','checkbox']] },
};
export const workingDays = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
export function validateImageFile(file) {
  if (!['image/jpeg','image/png','image/webp'].includes(file.type)) return 'Choose a JPG, PNG or WebP image.';
  if (!file.size) return 'The image file is empty.';
  if (file.size > 2 * 1024 * 1024) return 'Image must be 2 MB or smaller.';
  return '';
}
export const numberRules = { price:{ min:0.01,max:1000000,step:'0.01' }, duration:{ min:1,max:1440,step:'1' }, experienceYears:{ min:0,max:60,step:'any' }, discountPercent:{ min:1,max:90,step:'any' } };
const validDate = value => /^\d{4}-\d{2}-\d{2}$/.test(value || '') && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0,10) === value;
// Match the backend limits and show errors next to their fields.
export function validateEntity(entity, values) {
  const errors = {};
  for (const [key,label,type,max] of entityConfigs[entity].fields) {
    const value = values[key];
    if (['text','tel'].includes(type) && (typeof value !== 'string' || !value.trim())) errors[key] = `${label} is required.`;
    if (max && typeof value === 'string' && value.trim().length > max) errors[key] = `Use at most ${max} characters.`;
    if (type === 'category' && !/^[a-f\d]{24}$/i.test(value || '')) errors[key] = 'Choose a category.';
    if (type === 'number') {
      const { min,max:maximum } = numberRules[key];
      if (value == null || (typeof value !== 'number' && typeof value !== 'string') || String(value).trim() === '' || !Number.isFinite(Number(value)) || Number(value) < min || Number(value) > maximum) errors[key] = `Enter a number between ${min} and ${maximum}.`;
      else if (key === 'duration' && !Number.isInteger(Number(value))) errors[key] = 'Duration must be a whole number of minutes.';
    }
    if (type === 'image' && typeof File !== 'undefined' && value instanceof File) { const message = validateImageFile(value); if (message) errors[key] = message; }
    if (type === 'image' && typeof value === 'string' && value.trim() && !/^\/uploads\/[a-f\d-]{36}\.(png|jpg|webp)$/.test(value)) {
      try { const parsed = new URL(value.trim()); if (!['http:','https:'].includes(parsed.protocol)) throw new Error(); }
      catch { errors[key] = 'Enter a complete http:// or https:// image URL.'; }
    }
    if (type === 'date' && !validDate(value)) errors[key] = 'Enter a valid date.';
    if (type === 'time' && !/^([01]\d|2[0-3]):[0-5]\d$/.test(value || '')) errors[key] = 'Enter a valid time.';
    if (type === 'days' && (!Array.isArray(value) || !value.length || value.some(day => !workingDays.includes(day)))) errors[key] = 'Select at least one working day.';
    if (type === 'checkbox' && typeof value !== 'boolean') errors[key] = 'Choose active or inactive.';
  }
  if (entity === 'staff') {
    if (!/^\d{10}$/.test(values.phone || '')) errors.phone = 'Enter a 10-digit phone number.';
    if (!errors.startTime && !errors.endTime && values.endTime <= values.startTime) errors.endTime = 'End time must be after start time.';
  }
  if (entity === 'offers') {
    if (values.code?.trim() && !/^[A-Z0-9_-]+$/i.test(values.code.trim())) errors.code = 'Use only letters, numbers, underscores or hyphens.';
    if (!errors.validFrom && !errors.validTo && values.validTo < values.validFrom) errors.validTo = 'End date must be on or after the start date.';
  }
  return errors;
}
export function entityPayload(entity, values) {
  return Object.fromEntries(entityConfigs[entity].fields.map(([key,,type]) => {
    const value = values[key];
    return [key,type === 'number' ? Number(value) : typeof value === 'string' ? (key === 'code' ? value.trim().toUpperCase() : value.trim()) : value];
  }));
}
