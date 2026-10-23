import { useState } from 'react';
import { Link } from 'react-router-dom';
import api, { messageOf } from '../../api/axios';
import useApi from '../../hooks/useApi';
import { dateLabel, money, shortId } from '../../utils/formatters';
import StatusBadge from '../../components/StatusBadge';
import Pagination from '../../components/Pagination';
import Alert from '../../components/Alert';
import Loader from '../../components/Loader';
import ConfirmDialog from '../../components/ConfirmDialog';
export default function MyAppointments() {
  const [status,setStatus] = useState(''); const [page,setPage] = useState(1); const [cancel,setCancel] = useState(null); const [busy,setBusy] = useState(false); const [error,setError] = useState('');
  const { data,loading,error:loadError,reload } = useApi(`/user/appointments?page=${page}&status=${status}`);
  async function confirm() { setBusy(true); try { await api.put(`/user/appointments/${cancel._id}/cancel`); setCancel(null); reload(); } catch(e) { setCancel(null); setError(messageOf(e)); } finally { setBusy(false); } }
  return <><div className="page-title"><div><span className="eyebrow">Your visits</span><h1>My Appointments</h1></div><Link className="btn small" to="/user/book">Book Appointment ↗</Link></div><div className="chips">{['','Pending','Confirmed','Completed','Cancelled'].map(s => <button key={s} className={s === status ? 'active' : ''} onClick={() => { setStatus(s); setPage(1); }}>{s || 'All visits'}</button>)}</div><Alert>{error || loadError}</Alert>{loading ? <Loader/> : <div className="appointment-grid">{data?.items.map(a => <article className="card appointment-card" key={a._id}><div className="card-bottom"><span className="eyebrow">#{shortId(a._id)}</span><StatusBadge status={a.status}/></div><h3>{dateLabel(a.appointmentDate)}</h3><p>{a.startTime} – {a.endTime} · {a.totalDuration} min</p><p>With {a.staffId?.name || 'Specialist'}</p><strong>{money(a.totalAmount-a.discountAmount)}</strong><div className="actions"><Link className="btn outline small" to={`/user/appointments/${a._id}`}>View Details</Link>{['Pending','Confirmed'].includes(a.status) && <button className="text-button danger-text" onClick={() => { setError(''); setCancel(a); }}>Cancel</button>}</div></article>)}</div>}{!loading && !data?.items.length && !loadError && <p className="empty-state">No appointments here yet. Your next moment of care is waiting.</p>}<Pagination page={page} pages={data?.pages || 0} onChange={setPage}/><ConfirmDialog open={!!cancel} busy={busy} title="Cancel this appointment?" onConfirm={confirm} onClose={() => setCancel(null)}>You can cancel only until 2 hours before the appointment. This cannot be undone.</ConfirmDialog></>;
}
