import BookingLink from '../../components/BookingLink';
import { Link, useParams } from 'react-router-dom';
import useApi from '../../hooks/useApi';
import PageBanner from '../../components/PageBanner';
import Loader from '../../components/Loader';
import Alert from '../../components/Alert';
import { money } from '../../utils/formatters';
import { fallbackImage, imageSource } from '../../utils/images';
export default function ServiceDetails() { const { id } = useParams(); const { data, loading, error } = useApi(`/public/services/${id}`); return <><PageBanner title={data?.name || 'Treatment Details'}/><section className="section container"><Alert>{error}</Alert>{loading ? <Loader/> : data && <div className="split"><img className="rounded-image" src={imageSource(data.image) || '/images/service-placeholder.svg'} onError={fallbackImage} alt={data.name} loading="lazy"/><div><span className="eyebrow">{data.categoryId?.name}</span><h2>{data.name}</h2><p>{data.description}</p><div className="detail-price">{money(data.price)} <small>· {data.duration} minutes</small></div><p>Your specialist will talk through your preferences and make sure you feel comfortable before your treatment begins.</p><BookingLink className="btn" to={`/user/book?service=${data._id}`}>Book This Treatment ↗</BookingLink></div></div>}</section></>; }
