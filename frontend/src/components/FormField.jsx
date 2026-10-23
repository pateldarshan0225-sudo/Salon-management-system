import { useId } from 'react';
export default function FormField({ label, error, children, ...props }) { const id = useId(); return <div className="field"><label htmlFor={id}>{label}</label>{children || <input id={id} aria-invalid={!!error} aria-describedby={error ? `${id}-error` : undefined} {...props}/ >}{error && <small className="field-error" id={`${id}-error`}>{error}</small>}</div>; }
