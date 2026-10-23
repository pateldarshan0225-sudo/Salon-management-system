import BookingLink from './BookingLink';
import { Link } from 'react-router-dom';
import { money } from '../utils/formatters';
import { fallbackImage, imageSource } from '../utils/images';
export default function ServiceCard({ service }) { return <article className="service-card"><Link to={`/services/${service._id}`} className="card-image"><img src={imageSource(service.image) || '/images/service-placeholder.svg'} onError={fallbackImage} alt={service.name} loading="lazy"/><span>{service.duration} min</span></Link><div className="card-body"><span className="eyebrow">{service.categoryId?.name}</span><h3><Link to={`/services/${service._id}`}>{service.name}</Link></h3><p>{service.description}</p><div className="card-bottom"><strong>{money(service.price)}</strong><BookingLink className="text-link" to={`/user/book?service=${service._id}`}>Book Now <span aria-hidden="true">↗</span></BookingLink></div></div></article>; }
