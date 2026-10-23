import bcrypt from 'bcrypt';
import User from '../models/User.js';
import Admin from '../models/Admin.js';
import { assert, email, password, profileInput } from '../utils/validation.js';
import { send } from '../utils/pagination.js';
import { cookieName, cookieOptions } from '../config/session.js';

export const safeAccount = account => ({ id: String(account._id), name: account.name, email: account.email });
async function startSession(req, account, role) {
  await new Promise((resolve, reject) => req.session.regenerate(error => error ? reject(error) : resolve()));
  req.session.account = { ...safeAccount(account), role };
  await new Promise((resolve, reject) => req.session.save(error => error ? reject(error) : resolve()));
  return req.session.account;
}
export async function register(req, res) {
  const input = profileInput(req.body); password(req.body.password);
  const account = await User.create({ ...input, password: await bcrypt.hash(req.body.password, Number(process.env.BCRYPT_ROUNDS) || 12) });
  send(res, await startSession(req, account, 'user'), 'Account created.', 201);
}
const loginWith = (Model, role) => async (req, res) => {
  const address = email(req.body.email);
  assert(typeof req.body.password === 'string' && req.body.password.length <= 100, 'Enter your password.');
  const account = await Model.findOne({ email: address }).select('+password');
  assert(account && await bcrypt.compare(req.body.password, account.password), 'Incorrect email or password.', 401);
  send(res, await startSession(req, account, role), 'Welcome back.');
};
export async function login(req, res) {
  const address = email(req.body.email);
  assert(typeof req.body.password === 'string' && req.body.password.length <= 100, 'Enter your password.');
  // Identify the role from a verified database account, never from form input.
  for (const [Model, role] of [[Admin, 'admin'], [User, 'user']]) {
    const account = await Model.findOne({ email: address }).select('+password');
    if (account && await bcrypt.compare(req.body.password, account.password)) {
      return send(res, await startSession(req, account, role), 'Welcome back.');
    }
  }
  assert(false, 'Incorrect email or password.', 401);
}
export const adminLogin = loginWith(Admin, 'admin');
export async function me(req, res) {
  if (!req.session.account) return send(res, null);
  const Model = req.session.account.role === 'admin' ? Admin : User;
  const account = await Model.findById(req.session.account.id);
  if (!account) { await new Promise(resolve => req.session.destroy(resolve)); return send(res, null); }
  send(res, { ...safeAccount(account), role: req.session.account.role });
}
export async function logout(req, res) {
  await new Promise((resolve, reject) => req.session.destroy(error => error ? reject(error) : resolve()));
  res.clearCookie(cookieName(), cookieOptions()); send(res, null, 'Logged out.');
}
