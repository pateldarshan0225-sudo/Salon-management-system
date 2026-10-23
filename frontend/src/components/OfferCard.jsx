import BookingLink from './BookingLink';
import { Link } from 'react-router-dom';
import { dateLabel } from '../utils/formatters';
export default function OfferCard({ offer, highlight = false }) { return <article className={`offer-card ${highlight ? 'highlight' : ''}`}><span className="eyebrow">A special invitation</span><h3>{offer.title}</h3><div className="discount">{offer.discountPercent}<span>%<small>OFF</small></span></div><p>{offer.description}</p><div className="offer-code">{offer.code}</div><small>Valid {dateLabel(offer.validFrom)} – {dateLabel(offer.validTo)}</small><BookingLink className="btn" to={`/user/book?offer=${offer.code}`}>Book Now ↗</BookingLink></article>; }
