export default function originMiddleware(req, res, next) {
  if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method) && req.headers.origin !== (process.env.CLIENT_URL || 'http://localhost:5173')) {
    return res.status(403).json({ success: false, message: 'Request origin is not allowed.', data: null });
  }
  next();
}
