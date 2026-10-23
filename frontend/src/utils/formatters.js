export const money = value => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(value || 0);
export const dateLabel = value => value ? new Date(`${value.slice(0,10)}T12:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
export const shortId = value => String(value?._id || value || '').slice(-6).toUpperCase();
export const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
export const maxDate = () => new Date(Date.parse(today()) + 30 * 86400000).toISOString().slice(0,10);
