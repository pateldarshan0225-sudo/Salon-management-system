import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Loader from '../components/Loader';
export default function AdminRoute() { const { account, loading } = useAuth(); const location = useLocation(); if (loading) return <Loader/>; if (!account) return <Navigate to="/login" state={{ from: location }} replace/>; if (account.role !== 'admin') return <Navigate to="/user" replace/>; return <Outlet/>; }
