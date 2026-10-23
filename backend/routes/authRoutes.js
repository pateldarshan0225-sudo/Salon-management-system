import { Router } from 'express';
import { register, login, adminLogin, me, logout } from '../controllers/authController.js';
const router = Router();
router.post('/register', register); router.post('/login', login); router.post('/admin/login', adminLogin); router.post('/logout', logout); router.get('/me', me);
export default router;
