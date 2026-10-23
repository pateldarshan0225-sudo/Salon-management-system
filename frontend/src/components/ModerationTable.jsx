import { useState } from 'react';
import useApi from '../hooks/useApi';
import api, { messageOf } from '../api/axios';
import Alert from './Alert';
import Loader from './Loader';
import Pagination from './Pagination';
import ConfirmDialog from './ConfirmDialog';
import { dateLabel } from '../utils/formatters';
export default function ModerationTable({ reviews = false }) {
  const entity = reviews ? 'reviews' : 'users'; const [page,setPage] = useState(1); const { data,loading,error,reload } = useApi(`/admin/${entity}?page=${page}`); const [remove,setRemove] = useState(null); const [busy,setBusy] = useState(false); const [failure,setFailure] = useState('');
  async function destroy() { setBusy(true); try { await api.delete(`/admin/${entity}/${remove._id}`); setRemove(null); if (data.items.length === 1 && page > 1) setPage(page-1); else reload(); } catch(e) { setRemove(null); setFailure(messageOf(e)); } finally { setBusy(false); } }
  return <><span className="eyebrow">{reviews ? 'Guest experiences' : 'Our community'}</span><h1>{reviews ? 'Reviews' : 'Customers'}</h1><Alert>{error || failure}</Alert>{loading ? <Loader/> : <div className="table-wrap"><table><thead><tr><th>{reviews ? 'Customer' : 'Name'}</th><th>{reviews ? 'Review' : 'Contact'}</th><th>Created</th><th>Actions</th></tr></thead><tbody>{data?.items.map(row => <tr key={row._id}><td data-label="Customer"><strong>{reviews ? row.userId?.name : row.name}</strong>{reviews && <small className="stars">{'★'.repeat(row.rating)}</small>}</td><td data-label={reviews ? 'Review' : 'Contact'}>{reviews ? row.comment : <>{row.email}<small>{row.phone}</small></>}</td><td data-label="Created">{dateLabel(row.createdAt)}</td><td data-label="Actions"><button className="btn outline small danger-text" onClick={() => setRemove(row)}>Delete</button></td></tr>)}</tbody></table>{data?.total === 0 && <p className="empty-state">No {entity} yet.</p>}</div>}<Pagination page={page} pages={data?.pages || 0} onChange={setPage}/><ConfirmDialog open={!!remove} busy={busy} title={reviews ? 'Delete this review?' : 'Delete customer and all related records?'} onConfirm={destroy} onClose={() => setRemove(null)}>{reviews ? 'This review will be permanently deleted.' : 'This deletes the customer, their appointments, appointment services, bills and reviews. This cannot be undone.'}</ConfirmDialog></>;
}
