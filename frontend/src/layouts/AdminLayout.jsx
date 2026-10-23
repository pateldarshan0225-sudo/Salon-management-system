import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { useAuth } from '../context/AuthContext';
export default function AdminLayout() { const { account } = useAuth(); return <div className="panel"><Sidebar admin/><main className="panel-main" id="main-content"><div className="panel-top"><span>SALON MANAGEMENT</span><span>{account.name} · Admin</span></div><Outlet/></main></div>; }
