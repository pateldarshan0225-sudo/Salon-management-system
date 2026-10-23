import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { validateAccount } from '../utils/validation';
import { messageOf } from '../api/axios';
import FormField from './FormField';
import PasswordInput from './PasswordInput';
import Alert from './Alert';
import PageBanner from './PageBanner';
export default function AuthForm({ mode = 'login' }) {
  const registering = mode === 'register'; const title = registering ? 'Create Your Account' : 'Welcome Back';
  const { account,login,register } = useAuth(); const location = useLocation(); const navigate = useNavigate();
  const [values,setValues] = useState({ name:'',email:'',phone:'',gender:'Prefer not to say',password:'' }); const [errors,setErrors] = useState({}); const [error,setError] = useState(''); const [busy,setBusy] = useState(false);
  if (account) return <Navigate to={account.role === 'admin' ? '/admin' : '/user'} replace/>;
  const field = name => ({ name,value:values[name],onChange:e => setValues({...values,[name]:e.target.value}) });
  async function submit(e) { e.preventDefault(); const validation = validateAccount(values,registering); setErrors(validation); if (Object.keys(validation).length) return; setBusy(true); setError(''); try { const user = registering ? await register(values) : await login(values); const from = location.state?.from; const home = user.role === 'admin' ? '/admin' : '/user'; const destination = from?.pathname === home || from?.pathname?.startsWith(`${home}/`) ? `${from.pathname}${from.search || ''}` : home; navigate(destination, { replace:true }); } catch (e) { setError(messageOf(e)); } finally { setBusy(false); } }
  return <><PageBanner title={title}/><section className="section container"><form className="auth-card card" onSubmit={submit} noValidate><span className="eyebrow">A little time for yourself</span><h2>{title}</h2><p>{registering ? 'Your next favourite ritual is one step closer.' : 'Sign in to your salon account.'}</p><Alert>{error}</Alert>{registering && <FormField label="Full name" placeholder="Your name" autoComplete="name" error={errors.name} {...field('name')}/>}<FormField label="Email address" type="email" placeholder="you@example.com" autoComplete="email" error={errors.email} {...field('email')}/>{registering && <><FormField label="Phone number" type="tel" inputMode="numeric" maxLength={10} placeholder="10-digit mobile number" autoComplete="tel" error={errors.phone} {...field('phone')}/><label className="field">Gender<select {...field('gender')}>{['Prefer not to say','Female','Male','Other'].map(g => <option key={g}>{g}</option>)}</select></label></>}<PasswordInput placeholder={registering ? '8+ characters, a letter and a number' : 'Your password'} autoComplete={registering ? 'new-password' : 'current-password'} error={errors.password} {...field('password')}/><button className="btn full" disabled={busy}>{busy ? 'Please wait…' : registering ? 'Register Now' : 'Login'}</button>{<p className="center">{registering ? 'Already have an account? ' : 'New to our sanctuary? '}<Link className="text-link" to={registering ? '/login' : '/register'} state={location.state}>{registering ? 'Login' : 'Register Now'}</Link></p>}</form></section></>;
}
