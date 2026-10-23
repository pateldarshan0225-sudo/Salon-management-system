export default function Alert({ children, type = 'error' }) { return children ? <div className={`alert ${type}`} role={type === 'error' ? 'alert' : 'status'}>{children}</div> : null; }
