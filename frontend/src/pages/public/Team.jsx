import { useState } from 'react';
import useApi from '../../hooks/useApi';
import PageBanner from '../../components/PageBanner';
import SectionHeading from '../../components/SectionHeading';
import StaffCard from '../../components/StaffCard';
import Pagination from '../../components/Pagination';
import Loader from '../../components/Loader';
import Alert from '../../components/Alert';
export default function Team() { const [page,setPage] = useState(1); const { data,loading,error } = useApi(`/public/staff?page=${page}&limit=12`); return <><PageBanner title="Our Specialists"/><section className="section container"><SectionHeading label="In caring hands" title="Meet the people behind your glow."/><Alert>{error}</Alert>{loading ? <Loader/> : <div className="grid three">{data?.items.map(s => <StaffCard key={s._id} staff={s}/>)}</div>}{data?.total === 0 && <p className="empty-state">Our team will be listed here soon.</p>}<Pagination page={page} pages={data?.pages || 0} onChange={setPage}/></section></>; }
