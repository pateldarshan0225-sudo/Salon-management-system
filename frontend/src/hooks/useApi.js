import { useEffect, useState, useCallback } from 'react';
import api, { messageOf } from '../api/axios';
export default function useApi(url) {
  const [data,setData] = useState(null); const [loading,setLoading] = useState(true); const [error,setError] = useState(''); const [version,setVersion] = useState(0);
  const reload = useCallback(() => setVersion(v => v + 1), []);
  useEffect(() => { let active = true; setLoading(true); setError(''); api.get(url).then(r => { if (active) setData(r.data.data); }).catch(e => { if (active) setError(messageOf(e)); }).finally(() => { if (active) setLoading(false); }); return () => { active = false; }; }, [url,version]);
  return { data, loading, error, reload, setData };
}
