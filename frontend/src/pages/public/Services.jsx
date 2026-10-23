import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import useApi from '../../hooks/useApi';
import PageBanner from '../../components/PageBanner';
import SectionHeading from '../../components/SectionHeading';
import ServiceCard from '../../components/ServiceCard';
import Pagination from '../../components/Pagination';
import Loader from '../../components/Loader';
import Alert from '../../components/Alert';
export default function Services() {
  const [params,setParams] = useSearchParams(); const [search,setSearch] = useState(params.get('search') || '');
  const categories = useApi('/public/categories?limit=100'); const page = Number(params.get('page')) || 1;
  const query = new URLSearchParams({ page,limit: 9,search: params.get('search') || '',categoryId: params.get('category') || '',maxPrice: params.get('maxPrice') || '',sort: params.get('sort') || 'name' });
  const { data, loading, error } = useApi(`/public/services?${query}`);
  const change = (key,value) => setParams(previous => { const next = new URLSearchParams(previous); if (value) next.set(key,value); else next.delete(key); if (key !== 'page') next.delete('page'); return next; });
  return <><PageBanner title="Our Treatments"/><section className="section container"><SectionHeading label="Find Your Ritual" title="A little care for every part of you."/><form className="filters" onSubmit={e => { e.preventDefault(); change('search',search); }}><label>Find a treatment<input placeholder="Search treatments…" value={search} onChange={e => setSearch(e.target.value)}/></label><button className="btn small">Search</button><label>Maximum price (₹)<input type="number" min="0" placeholder="Any price" value={params.get('maxPrice') || ''} onChange={e => change('maxPrice',e.target.value)}/></label><label>Sort by<select value={params.get('sort') || 'name'} onChange={e => change('sort',e.target.value)}><option value="name">Name A–Z</option><option value="-name">Name Z–A</option><option value="price">Price: low to high</option><option value="-price">Price: high to low</option></select></label></form><div className="chips"><button className={!params.get('category') ? 'active' : ''} onClick={() => change('category','')}>All Treatments</button>{categories.data?.items.map(c => <button key={c._id} className={params.get('category') === c._id ? 'active' : ''} onClick={() => change('category',c._id)}>{c.name}</button>)}</div><Alert>{error || categories.error}</Alert>{loading ? <Loader/> : <><p className="muted">{data?.total || 0} treatments to discover</p><div className="grid three">{data?.items.map(s => <ServiceCard key={s._id} service={s}/>)}</div>{!data?.items.length && !error && <p className="empty-state">No treatments match your search. Try another category or price.</p>}<Pagination page={page} pages={data?.pages || 0} onChange={n => change('page',n)}/></>}</section></>;
}
