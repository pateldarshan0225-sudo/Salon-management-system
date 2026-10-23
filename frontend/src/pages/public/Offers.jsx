import { useState } from 'react';
import useApi from '../../hooks/useApi';
import PageBanner from '../../components/PageBanner';
import SectionHeading from '../../components/SectionHeading';
import OfferCard from '../../components/OfferCard';
import Pagination from '../../components/Pagination';
import Loader from '../../components/Loader';
import Alert from '../../components/Alert';
export default function Offers() { const [page,setPage] = useState(1); const { data,loading,error } = useApi(`/public/offers?page=${page}&limit=9`); return <><PageBanner title="Special Offers"/><section className="section container"><SectionHeading label="More reasons to feel good" title="A little something, just for you."/><Alert>{error}</Alert>{loading ? <Loader/> : <div className="grid three">{data?.items.map((o,i) => <OfferCard key={o._id} offer={o} highlight={i === 1}/>)}</div>}{data?.total === 0 && <p className="empty-state">No offers are active at the moment. Your next favourite treatment is still waiting.</p>}<Pagination page={page} pages={data?.pages || 0} onChange={setPage}/></section></>; }
