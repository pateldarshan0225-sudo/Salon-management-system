import BookingLink from './BookingLink';
import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
export default function Navbar() {
  const [open, setOpen] = useState(false); const [scrolled, setScrolled] = useState(false); const { pathname } = useLocation(); const { account } = useAuth();
  useEffect(() => { const scroll = () => setScrolled(window.scrollY > 30); scroll(); window.addEventListener('scroll', scroll); return () => window.removeEventListener('scroll', scroll); }, []);
  useEffect(() => { const key = e => { if (e.key === 'Escape') setOpen(false); }; window.addEventListener('keydown', key); return () => window.removeEventListener('keydown', key); }, []);
  return <nav className={`navbar ${pathname === '/' && !scrolled ? 'transparent' : ''}`} aria-label="Main navigation"><div className="container nav-inner"><Link className="brand" to="/" onClick={() => setOpen(false)}><img src="/images/logo.svg" alt=""/><span>Sage & Serenity<small>SALON & SPA</small></span></Link><button className="menu-toggle" aria-expanded={open} aria-controls="main-menu" aria-label="Toggle navigation" onClick={() => setOpen(!open)}>{open ? '✕' : '☰'}</button><div id="main-menu" className={`nav-links ${open ? 'open' : ''}`}>{[['/', 'Home'], ['/about', 'About'], ['/services', 'Treatments'], ['/team', 'Specialists'], ['/offers', 'Offers'], ['/contact', 'Contact']].map(([path, label]) => <NavLink key={path} end={path === '/'} to={path} onClick={() => setOpen(false)}>{label}</NavLink>)}<Link to={account ? account.role === 'admin' ? '/admin' : '/user' : '/login'} onClick={() => setOpen(false)}>{account ? 'My Dashboard' : 'Login'}</Link><BookingLink className="btn small" to="/user/book" onClick={() => setOpen(false)}>Book Appointment ↗</BookingLink></div></div></nav>;
}
