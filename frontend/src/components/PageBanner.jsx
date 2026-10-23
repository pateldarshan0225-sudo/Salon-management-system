import Breadcrumbs from './Breadcrumbs';
import { images, fallbackImage } from '../utils/images';
export default function PageBanner({ title }) { return <header className="page-banner"><img src={images.banner} onError={e => fallbackImage(e, 'hero')} alt="A tranquil salon space" loading="lazy"/><div><span className="eyebrow">Sage & Serenity</span><h1>{title}</h1><Breadcrumbs title={title}/></div></header>; }
