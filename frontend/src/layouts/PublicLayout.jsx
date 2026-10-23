import { Outlet } from 'react-router-dom';
import { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import api from '../api/axios';
export default function PublicLayout() { const [categories, setCategories] = useState([]); useEffect(() => { api.get('/public/categories?limit=100').then(r => setCategories(r.data.data.items)).catch(() => {}); }, []); return <><Navbar/><main id="main-content"><Outlet/></main><Footer categories={categories}/></>; }
