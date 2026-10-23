import { useEffect, useState } from 'react';
export default function TestimonialSlider({ reviews = [] }) {
  const [index, setIndex] = useState(0);
  useEffect(() => { if (reviews.length < 2 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return; const timer = setInterval(() => setIndex(n => (n + 1) % reviews.length), 6500); return () => clearInterval(timer); }, [reviews.length]);
  if (!reviews.length) return <div className="empty-state">Your story belongs here. After your first completed treatment, share a little of your experience.</div>;
  const review = reviews[index % reviews.length];
  return <div className="testimonial" aria-roledescription="carousel" aria-label="Customer reviews"><span className="quote-mark" aria-hidden="true">“</span><div className="stars" aria-label={`${review.rating} out of 5 stars`}>{'★'.repeat(review.rating)}</div><blockquote>{review.comment}</blockquote><strong>{review.userId?.name || 'Salon guest'}</strong><p>Verified appointment</p><div className="slider-controls"><button aria-label="Previous review" onClick={() => setIndex(n => (n - 1 + reviews.length) % reviews.length)}>←</button>{reviews.map((r, n) => <button key={r._id} className={`dot ${n === index ? 'active' : ''}`} aria-label={`Show review ${n + 1}`} aria-pressed={n === index} onClick={() => setIndex(n)}/>)}<button aria-label="Next review" onClick={() => setIndex(n => (n + 1) % reviews.length)}>→</button></div></div>;
}
