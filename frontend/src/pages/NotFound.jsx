import { Link } from 'react-router-dom';
export default function NotFound() { return <main className="not-found" id="main-content"><span className="eyebrow">A little off the path</span><h1>404</h1><h2>This page has wandered away.</h2><p>Let’s get you back to somewhere peaceful.</p><Link className="btn" to="/">Back to Home</Link></main>; }
