import { Link } from 'react-router-dom';
export default function Breadcrumbs({ title }) { return <nav aria-label="Breadcrumb" className="breadcrumbs"><Link to="/">Home</Link><span aria-hidden="true"> / </span><span aria-current="page">{title}</span></nav>; }
