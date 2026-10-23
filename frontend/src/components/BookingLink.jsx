import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Booking actions are for guests and customers, never administrators.
export default function BookingLink(props) {
  const { account, loading } = useAuth();
  if (loading || account?.role === 'admin') return null;
  return <Link {...props}/>;
}
