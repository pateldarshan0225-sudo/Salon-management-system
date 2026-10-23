import { useLayoutEffect } from 'react';
import { useLocation } from 'react-router-dom';

export default function RouteEffects() {
  const { key } = useLocation();
  // Runs after lazy routes commit. Global smooth scrolling must not carry panel scroll into Home.
  useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [key]);
  return null;
}
