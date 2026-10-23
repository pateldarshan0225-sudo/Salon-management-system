import { assert, boolean } from '../utils/validation.js';
import { send } from '../utils/pagination.js';
// Change status without overwriting other fields from an old form.
export const updateActive = (Model, label) => async (req, res) => {
  const isActive = boolean(req.body?.isActive);
  const record = await Model.findByIdAndUpdate(req.params.id, { $set: { isActive } }, { new:true,runValidators:true });
  assert(record, `${label} not found.`, 404);
  send(res, record, `${label} is now ${isActive ? 'active' : 'inactive'}.`);
};
