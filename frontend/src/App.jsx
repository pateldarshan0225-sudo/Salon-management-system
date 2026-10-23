import { lazy, Suspense, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import PublicLayout from './layouts/PublicLayout';
import UserLayout from './layouts/UserLayout';
import AdminLayout from './layouts/AdminLayout';
import ProtectedRoute from './routes/ProtectedRoute';
import AdminRoute from './routes/AdminRoute';
import Loader from './components/Loader';
import RouteEffects from './components/RouteEffects';
const publicPages = Object.fromEntries(['Home','About','Services','ServiceDetails','Team','Offers','Contact','Login','Register','AdminLogin'].map(name => [name,lazy(() => import(`./pages/public/${name}.jsx`))]));
const userPages = Object.fromEntries(['Dashboard','BookAppointment','MyAppointments','AppointmentDetails','Profile','MyReviews'].map(name => [name,lazy(() => import(`./pages/user/${name}.jsx`))]));
const adminPages = Object.fromEntries(['Dashboard','Categories','Services','Staff','Offers','Appointments','Bills','Users','Reviews'].map(name => [name,lazy(() => import(`./pages/admin/${name}.jsx`))]));
const NotFound = lazy(() => import('./pages/NotFound'));
export default function App() {
  useEffect(() => {
    if (!('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    // Keep one observer alive across lazy route changes, including Suspense retries.
    const observed = new WeakSet();
    const observer = new IntersectionObserver(entries => entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('visible'); observer.unobserve(entry.target); } }), { threshold: 0.08 });
    const observe = () => document.querySelectorAll('[data-reveal]').forEach(el => {
      if (observed.has(el) || el.classList.contains('visible')) return;
      observed.add(el); el.classList.add('reveal-ready'); observer.observe(el);
    });
    const mutations = new MutationObserver(observe); mutations.observe(document.getElementById('root'), { childList:true,subtree:true }); observe();
    return () => { mutations.disconnect(); observer.disconnect(); };
  }, []);
  return <><a className="skip-link" href="#main-content">Skip to content</a><Suspense fallback={<Loader/>}><RouteEffects/><Routes><Route element={<PublicLayout/>}>{[['/','Home'],['/about','About'],['/services','Services'],['/services/:id','ServiceDetails'],['/team','Team'],['/offers','Offers'],['/contact','Contact'],['/login','Login'],['/register','Register'],['/admin/login','AdminLogin']].map(([path,name]) => { const Page = publicPages[name]; return <Route key={path} path={path} element={<Page/>}/>; })}</Route><Route element={<ProtectedRoute/>}><Route path="/user" element={<UserLayout/>}>{[['','Dashboard'],['book','BookAppointment'],['appointments','MyAppointments'],['appointments/:id','AppointmentDetails'],['profile','Profile'],['reviews','MyReviews']].map(([path,name]) => { const Page = userPages[name]; return path ? <Route key={name} path={path} element={<Page/>}/> : <Route key={name} index element={<Page/>}/>; })}</Route></Route><Route element={<AdminRoute/>}><Route path="/admin" element={<AdminLayout/>}>{[['','Dashboard'],['categories','Categories'],['services','Services'],['staff','Staff'],['offers','Offers'],['appointments','Appointments'],['bills','Bills'],['users','Users'],['reviews','Reviews']].map(([path,name]) => { const Page = adminPages[name]; return path ? <Route key={name} path={path} element={<Page/>}/> : <Route key={name} index element={<Page/>}/>; })}</Route></Route><Route path="*" element={<NotFound/>}/></Routes></Suspense></>;
}
