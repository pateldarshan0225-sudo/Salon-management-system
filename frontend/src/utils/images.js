const photo = id => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1400&q=80`;
// Uploaded files are served by Express, while Vite serves the frontend.
export const imageSource = value => value?.startsWith('/uploads/') ? new URL(value, import.meta.env?.VITE_API_BASE_URL || 'http://localhost:5001/api').href : value || '';
export const images = { hero: photo('photo-1540555700478-4be289fbecef'), about: photo('photo-1600948836101-f9ffda59d250'), banner: photo('photo-1564540583246-934409427776'), gallery: [photo('photo-1562322140-8baeececf3df'), photo('photo-1570172619644-dfd03ed5d881'), photo('photo-1604654894610-df63bc536371'), photo('photo-1544161515-4ab6ce6db874')] };
export const fallbackImage = (event, type = 'service') => { event.currentTarget.onerror = null; event.currentTarget.src = `/images/${type === 'staff' ? 'staff' : type === 'hero' ? 'hero-salon' : 'service-placeholder'}.svg`.replace('staff.svg', 'staff-placeholder.svg'); };
