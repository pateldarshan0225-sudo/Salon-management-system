import { Router, raw } from 'express';
import { isAdmin } from '../middleware/authMiddleware.js';
import validateObjectId from '../middleware/validateObjectId.js';
import * as categories from '../controllers/categoryController.js';
import * as services from '../controllers/serviceController.js';
import * as staff from '../controllers/staffController.js';
import * as offers from '../controllers/offerController.js';
import * as appointments from '../controllers/appointmentController.js';
import * as bills from '../controllers/billController.js';
import * as users from '../controllers/userController.js';
import * as reviews from '../controllers/reviewController.js';
import { dashboard } from '../controllers/dashboardController.js';
import Category from '../models/ServiceCategory.js';
import Service from '../models/Service.js';
import Staff from '../models/Staff.js';
import Offer from '../models/Offer.js';
import { updateActive } from '../controllers/activeController.js';
import { uploadImage } from '../controllers/uploadController.js';
const router = Router(); router.use(isAdmin);
router.post('/uploads/images', raw({ type: () => true, limit:'2mb' }), uploadImage);
router.get('/dashboard', dashboard);
for (const [name, Model, label] of [['categories',Category,'Category'],['services',Service,'Service'],['staff',Staff,'Specialist'],['offers',Offer,'Offer']]) {
  router.patch(`/${name}/:id/active`, validateObjectId, updateActive(Model, label));
}
for (const [name, getAll, getOne, create, update, remove] of [
  ['categories', categories.getCategories, categories.getCategory, categories.createCategory, categories.updateCategory, categories.deleteCategory],
  ['services', services.getServices, services.getService, services.createService, services.updateService, services.deleteService],
  ['staff', staff.getStaff, staff.getStaffMember, staff.createStaff, staff.updateStaff, staff.deleteStaff],
  ['offers', offers.getOffers, offers.getOffer, offers.createOffer, offers.updateOffer, offers.deleteOffer],
]) {
  router.route(`/${name}`).get(getAll).post(create);
  router.route(`/${name}/:id`).all(validateObjectId).get(getOne).put(update).delete(remove);
}
router.get('/appointments', appointments.getAppointments); router.get('/appointments/:id', validateObjectId, appointments.getAppointment); router.put('/appointments/:id/status', validateObjectId, appointments.updateStatus);
router.get('/bills', bills.getBills); router.route('/bills/:id').all(validateObjectId).get(bills.getBill).put(bills.updateBill).delete(bills.deleteBill);
router.get('/users', users.getUsers); router.delete('/users/:id', validateObjectId, users.deleteUser);
router.get('/reviews', reviews.getReviews); router.delete('/reviews/:id', validateObjectId, reviews.deleteReview);
export default router;
