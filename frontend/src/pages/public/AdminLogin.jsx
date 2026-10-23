import { Navigate, useLocation } from 'react-router-dom';
// Keep old bookmarks working through the shared login page.
export default function AdminLogin() { const location = useLocation(); return <Navigate to="/login" state={location.state} replace/>; }
