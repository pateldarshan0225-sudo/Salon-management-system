import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Loader from '../components/Loader';
export default function ProtectedRoute() { const { account, loading } = useAuth(); const location = useLocation(); if (loading) return <Loader/>; if (!account) return <Navigate to="/login" state={{ from: location }} replace/>; if (account.role !== 'user') return <Navigate to="/admin" replace/>; return <Outlet/>; }
