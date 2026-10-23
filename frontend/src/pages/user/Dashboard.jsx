import { Link } from 'react-router-dom';
import useApi from '../../hooks/useApi';
import { useAuth } from '../../context/AuthContext';
import StatCard from '../../components/StatCard';
import Alert from '../../components/Alert';
import Loader from '../../components/Loader';
import StatusBadge from '../../components/StatusBadge';
import { dateLabel } from '../../utils/formatters';
export default function Dashboard() { const { account } = useAuth(); const all = useApi('/user/appointments?limit=5'); const pending = useApi('/user/appointments?status=Pending&limit=1'); const completed = useApi('/user/appointments?status=Completed&limit=1'); return <><span className="eyebrow">Welcome to your sanctuary</span><h1>A little time for you, {account.name.split(' ')[0]}.</h1><div className="booking-cta"><div><h2>Your next feel-good moment.</h2><p>Explore our treatments and find a time that feels right.</p></div><Link className="btn" to="/user/book">Book Appointment ↗</Link></div><div className="grid three"><StatCard label="Total visits" value={all.data?.total || 0}/><StatCard label="Pending confirmation" value={pending.data?.total || 0}/><StatCard label="Completed visits" value={completed.data?.total || 0}/></div><h2>Recent Appointments</h2><Alert>{all.error || pending.error || completed.error}</Alert>{all.loading ? <Loader/> : <div className="card">{all.data?.items.length ? all.data.items.map(a => <Link key={a._id} to={`/user/appointments/${a._id}`} className="summary-row"><span>{dateLabel(a.appointmentDate)} · {a.startTime}<small>{a.staffId?.name}</small></span><StatusBadge status={a.status}/></Link>) : <p>No visits yet. Start with a treatment you’ll love.</p>}</div>}</>; }
