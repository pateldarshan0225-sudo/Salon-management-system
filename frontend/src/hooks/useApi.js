import { useEffect, useState, useCallback } from 'react';
import api, { messageOf } from '../api/axios';
export default function useApi(url, refreshMs = 0) {
  const [data,setData] = useState(null); const [loading,setLoading] = useState(true); const [error,setError] = useState(''); const [version,setVersion] = useState(0);
  const reload = useCallback(() => setVersion(v => v + 1), []);
  useEffect(() => {
    let active = true; let running = false;
    async function fetchData(initial = false) {
      if (running) return;
      running = true;
      if (initial) { setLoading(true); setError(''); }
      try { const response = await api.get(url); if (active) { setData(response.data.data); setError(''); } }
      catch (error) { if (active) setError(messageOf(error)); }
      finally { running = false; if (active && initial) setLoading(false); }
    }
    fetchData(true);
    const timer = refreshMs > 0 ? setInterval(() => { if (!document.hidden) fetchData(); }, refreshMs) : null;
    return () => { active = false; if (timer) clearInterval(timer); };
  }, [url,version,refreshMs]);
  return { data, loading, error, reload, setData };
}
