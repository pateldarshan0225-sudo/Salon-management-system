import { useState } from 'react';
import api, { messageOf } from '../../api/axios';
import useApi from '../../hooks/useApi';
import Alert from '../../components/Alert';
import Loader from '../../components/Loader';
import Pagination from '../../components/Pagination';
import ConfirmDialog from '../../components/ConfirmDialog';
import { dateLabel } from '../../utils/formatters';
export default function MyReviews() {
  const [page,setPage] = useState(1); const { data,loading,error,reload } = useApi(`/user/reviews?page=${page}`); const [edit,setEdit] = useState(null); const [remove,setRemove] = useState(null); const [busy,setBusy] = useState(false); const [feedback,setFeedback] = useState('');
  async function save(e) { e.preventDefault(); setBusy(true); try { await api.put(`/user/reviews/${edit._id}`, { rating:Number(edit.rating),comment:edit.comment }); setEdit(null); reload(); } catch(e) { setFeedback(messageOf(e)); } finally { setBusy(false); } }
  async function destroy() { setBusy(true); try { await api.delete(`/user/reviews/${remove._id}`); setRemove(null); reload(); } catch(e) { setRemove(null); setFeedback(messageOf(e)); } finally { setBusy(false); } }
  return <><span className="eyebrow">Your stories</span><h1>My Reviews</h1><p>Reviews can be added from a completed appointment’s details.</p><Alert>{error || feedback}</Alert>{loading ? <Loader/> : <div className="grid two">{data?.items.map(r => <article className="card" key={r._id}><span className="stars">{'★'.repeat(r.rating)}</span><p>{r.comment}</p><small>{dateLabel(r.appointmentId?.appointmentDate)}</small><div className="actions"><button className="btn outline small" onClick={() => setEdit({...r})}>Edit</button><button className="text-button danger-text" onClick={() => setRemove(r)}>Delete</button></div></article>)}</div>}{data?.total === 0 && <p className="empty-state">Your stories will appear here after a completed visit.</p>}<Pagination page={page} pages={data?.pages || 0} onChange={setPage}/>{edit && <form className="card review-form" onSubmit={save}><h2>Edit your review</h2><label className="field">Rating<select value={edit.rating} onChange={e => setEdit({...edit,rating:e.target.value})}>{[5,4,3,2,1].map(n => <option key={n}>{n}</option>)}</select></label><label className="field">Comment<textarea value={edit.comment} required maxLength={1500} onChange={e => setEdit({...edit,comment:e.target.value})}/></label><div className="actions"><button className="btn" disabled={busy}>Save Review</button><button type="button" className="btn outline" onClick={() => setEdit(null)}>Cancel</button></div></form>}<ConfirmDialog open={!!remove} onClose={() => setRemove(null)} onConfirm={destroy} busy={busy} title="Delete this review?"/></>;
}
