import session from 'express-session';
import MongoStore from 'connect-mongo';

export const cookieName = () => process.env.SESSION_NAME || 'salon.sid';
export const cookieOptions = () => ({
  httpOnly: true,
  secure: process.env.SESSION_COOKIE_SECURE === 'true',
  sameSite: process.env.SESSION_COOKIE_SAME_SITE || 'lax',
  path: '/',
});
export default function sessionMiddleware() {
  return session({
    name: cookieName(), secret: process.env.SESSION_SECRET,
    resave: false, saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: process.env.SESSION_MONGODB_URI }),
    cookie: { ...cookieOptions(), maxAge: Number(process.env.SESSION_MAX_AGE) || 86400000 },
  });
}
