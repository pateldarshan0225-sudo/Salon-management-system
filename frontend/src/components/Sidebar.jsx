import { NavLink, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useState } from 'react';
import Alert from './Alert';
import { messageOf } from '../api/axios';
export default function Sidebar({ admin = false }) {
  const { logout } = useAuth(); const [open, setOpen] = useState(false); const [error, setError] = useState('');
  const base = admin ? '/admin' : '/user';
  const links = admin ? [['','Overview'],['categories','Categories'],['services','Services'],['staff','Staff'],['offers','Offers'],['appointments','Appointments'],['bills','Bills'],['users','Customers'],['reviews','Reviews']] : [['','Overview'],['book','Book Appointment'],['appointments','My Appointments'],['reviews','My Reviews'],['profile','My Profile']];
  return <><button className="panel-menu btn small" aria-expanded={open} aria-controls="panel-nav" onClick={() => setOpen(!open)}>☰ Menu</button><aside className={`sidebar ${open ? 'open' : ''}`} id="panel-nav"><Link className="brand" to="/">Sage & Serenity</Link><span className="eyebrow">{admin ? 'Administration' : 'Your sanctuary'}</span><nav aria-label={admin ? 'Admin navigation' : 'Customer navigation'}>{links.map(([path,label]) => <NavLink key={path} to={`${base}${path ? `/${path}` : ''}`} end={!path} onClick={() => setOpen(false)}><span aria-hidden="true">✧</span>{label}</NavLink>)}</nav><div className="sidebar-actions"><Link className="visit-website" to="/" onClick={() => setOpen(false)}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18M5 7h14M5 17h14"/></svg><span>Visit Website</span><svg className="visit-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M6 18 18 6M6 6h12v12"/></svg></Link><button className="btn outline small" onClick={async () => { try { await logout(); } catch (e) { setError(messageOf(e)); } }}>Logout</button></div><Alert>{error}</Alert></aside></>;
}
