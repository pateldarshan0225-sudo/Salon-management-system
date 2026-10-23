import { createContext, useContext, useEffect, useState } from 'react';
import api from '../api/axios';
const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);
export function AuthProvider({ children }) {
  const [account, setAccount] = useState(null); const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    api.get('/auth/me').then(({ data }) => { if (active) setAccount(data.data); }).catch(() => { if (active) setAccount(null); }).finally(() => { if (active) setLoading(false); });
    const expired = () => setAccount(null); window.addEventListener('auth-expired', expired);
    return () => { active = false; window.removeEventListener('auth-expired', expired); };
  }, []);
  async function login(credentials) { const { data } = await api.post('/auth/login', credentials); setAccount(data.data); return data.data; }
  async function register(values) { const { data } = await api.post('/auth/register', values); setAccount(data.data); return data.data; }
  async function logout() { await api.post('/auth/logout'); setAccount(null); }
  return <AuthContext.Provider value={{ account, loading, login, register, logout, setAccount }}>{children}</AuthContext.Provider>;
}
