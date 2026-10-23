export function notFound(req, res) { res.status(404).json({ success: false, message: 'Route not found.', data: null }); }
export default function errorMiddleware(error, req, res, next) {
  if (res.headersSent) return next(error);
  let status = error.status || 500;
  let message = error.message;
  if (error.code === 11000) { status = 409; message = 'A record with that unique value already exists.'; }
  if (['ValidationError', 'CastError'].includes(error.name)) { status = 400; message = error.name === 'CastError' ? 'Invalid identifier or value.' : Object.values(error.errors).map(e => e.message).join(' '); }
  if (error.type === 'entity.parse.failed') { status = 400; message = 'Invalid JSON request.'; }
  if (error.type === 'entity.too.large') { status = 413; message = 'File or request is too large. Images must be 2 MB or smaller.'; }
  if (status === 500) { console.error('Request failed:', error.name); message = 'Something went wrong. Please try again.'; }
  res.status(status).json({ success: false, message, data: null });
}
