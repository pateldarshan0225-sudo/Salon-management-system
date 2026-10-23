import { id } from '../utils/validation.js';
export default function validateObjectId(req, res, next) { try { id(req.params.id); next(); } catch (error) { next(error); } }
