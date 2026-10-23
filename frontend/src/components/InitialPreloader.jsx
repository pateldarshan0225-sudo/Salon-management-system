import { useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';

// The initial screen lives in index.html so it appears before React downloads.
export default function InitialPreloader() {
  const { loading } = useAuth();
  const started = useRef(performance.now());
  useEffect(() => {
    const screen = document.getElementById('site-preloader');
    if (!screen || screen.classList.contains('leaving')) return;
    const root = document.getElementById('root');
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let finishTimer;
    function dismiss() {
      if (screen.classList.contains('leaving')) return;
      screen.classList.add('leaving');
      root.removeAttribute('inert'); root.removeAttribute('aria-hidden');
      document.documentElement.classList.remove('site-starting');
      screen.setAttribute('aria-hidden', 'true');
      finishTimer = setTimeout(() => screen.remove(), reduced ? 0 : 450);
    }
    const minimum = reduced ? 0 : 900;
    function check() {
      if (!loading && root.querySelector('main')) {
        clearTimeout(finishTimer);
        finishTimer = setTimeout(dismiss, Math.max(0, minimum - (performance.now() - started.current)));
      }
    }
    const observer = new MutationObserver(check);
    observer.observe(root, { childList: true, subtree: true });
    check();
    // A failed API/image request must never leave the website behind an overlay.
    const maximumTimer = setTimeout(dismiss, Math.max(0, 3500 - (performance.now() - started.current)));
    return () => { observer.disconnect(); clearTimeout(finishTimer); clearTimeout(maximumTimer); };
  }, [loading]);
  return null;
}
