import { Router } from 'express';
import * as controller from '../controllers/publicController.js';
import validateObjectId from '../middleware/validateObjectId.js';
const router = Router();
for (const route of ['categories', 'services', 'staff', 'offers', 'reviews', 'stats']) router.get(`/${route}`, controller[route]);
router.get('/services/:id', validateObjectId, controller.service);
export default router;
