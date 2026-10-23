import { useEffect, useRef, useState } from 'react';
export default function StatsCounter({ stats = {} }) {
  const ref = useRef(null); const [progress, setProgress] = useState(0);
  useEffect(() => {
    let frame; const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const observer = new IntersectionObserver(entries => { if (!entries[0].isIntersecting) return; observer.disconnect(); const start = performance.now(); const tick = now => { const fraction = reduced ? 1 : Math.min((now - start) / 1200, 1); setProgress(fraction); if (fraction < 1) frame = requestAnimationFrame(tick); }; frame = requestAnimationFrame(tick); });
    observer.observe(ref.current); return () => { observer.disconnect(); cancelAnimationFrame(frame); };
  }, []);
  return <section className="stats-band" ref={ref}><div className="container stats-grid">{[['happyCustomers', 'Happy Customers'], ['services', 'Treatments'], ['specialists', 'Specialists'], ['completedAppointments', 'Completed Appointments']].map(([key, label]) => <div key={key}><strong>{Math.round((stats[key] || 0) * progress)}</strong><span>{label}</span></div>)}</div></section>;
}
