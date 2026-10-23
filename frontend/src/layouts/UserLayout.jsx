import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { useAuth } from '../context/AuthContext';
export default function UserLayout() { const { account } = useAuth(); return <div className="panel"><Sidebar/><main className="panel-main" id="main-content"><div className="panel-top"><span>YOUR PERSONAL SPACE</span><span>Hello, {account.name}</span></div><Outlet/></main></div>; }
