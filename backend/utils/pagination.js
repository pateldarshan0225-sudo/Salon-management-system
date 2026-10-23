export function pagination(query) {
  const page = Math.max(1, Math.floor(Number(query.page) || 1));
  const limit = Math.min(100, Math.max(1, Math.floor(Number(query.limit) || 12)));
  return { page, limit, skip: (page - 1) * limit };
}
export async function list(Model, filter, query, populate = '', sort = { _id: -1 }) {
  const { page, limit, skip } = pagination(query);
  const [items, total] = await Promise.all([Model.find(filter).populate(populate).sort(sort).skip(skip).limit(limit), Model.countDocuments(filter)]);
  return { items, total, page, limit, pages: Math.ceil(total / limit) };
}
export const send = (res, data = null, message = 'Success', status = 200) => res.status(status).json({ success: true, message, data });
