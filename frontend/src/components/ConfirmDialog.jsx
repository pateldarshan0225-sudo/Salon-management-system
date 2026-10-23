import { useEffect, useRef } from 'react';
export default function ConfirmDialog({ open, title = 'Please confirm', children, onConfirm, onClose, busy = false }) {
  const ref = useRef(null);
  useEffect(() => { if (open) ref.current.showModal(); else ref.current.close(); }, [open]);
  return <dialog ref={ref} className="confirm-dialog" onCancel={e => { e.preventDefault(); if (!busy) onClose(); }} aria-labelledby="confirm-title"><h2 id="confirm-title">{title}</h2><p>{children || 'This action cannot be undone. Are you sure?'}</p><div className="actions"><button className="btn outline" onClick={onClose} disabled={busy} autoFocus>Keep it</button><button className="btn danger" onClick={onConfirm} disabled={busy}>{busy ? 'Please wait…' : 'Confirm'}</button></div></dialog>;
}
