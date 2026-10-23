import { useId, useRef, useState } from 'react';
import useApi from '../hooks/useApi';
import api, { messageOf } from '../api/axios';
import Alert from './Alert';
import ImageUpload from './ImageUpload';
import Loader from './Loader';
import Pagination from './Pagination';
import ConfirmDialog from './ConfirmDialog';
import { money, dateLabel } from '../utils/formatters';
import { entityConfigs, entityPayload, numberRules, validateEntity, workingDays } from '../utils/entityValidation';

export default function EntityManager({ entity }) {
  const config = entityConfigs[entity];
  const prefix = useId();
  const formRef = useRef(null);
  const [page, setPage] = useState(1);
  const { data, loading, error, reload } = useApi(`/admin/${entity}?page=${page}&limit=10`);
  const categories = useApi('/admin/categories?limit=100');
  const [edit, setEdit] = useState(null);
  const [errors, setErrors] = useState({});
  const [remove, setRemove] = useState(null);
  const [busy, setBusy] = useState(false);
  const [imageChecking, setImageChecking] = useState(false);
  const [failure, setFailure] = useState('');
  const [success, setSuccess] = useState('');

  function start(row) {
    setFailure(''); setSuccess(''); setErrors({});
    setEdit(row ? { ...row, categoryId: row.categoryId?._id || row.categoryId || '' } : Object.fromEntries(config.fields.map(([key, , type]) => [key,
      type === 'checkbox' ? true : type === 'days' ? workingDays.slice(0, 6) : key === 'startTime' ? '09:00' : key === 'endTime' ? '18:00' : key === 'experienceYears' ? '0' : '',
    ])));
    requestAnimationFrame(() => { formRef.current?.scrollIntoView({ block: 'start', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' }); formRef.current?.querySelector('input, select')?.focus({ preventScroll: true }); });
  }
  function change(key, value) {
    const next = { ...edit, [key]: value }; setEdit(next);
    if (Object.keys(errors).length) setErrors(validateEntity(entity, next));
    setFailure(''); setSuccess('');
  }
  async function save(event) {
    event.preventDefault(); if (busy || imageChecking) return;
    const validation = validateEntity(entity, edit);
    setErrors(validation); setFailure(''); setSuccess('');
    if (Object.keys(validation).length) {
      requestAnimationFrame(() => formRef.current?.querySelector('[aria-invalid="true"]')?.focus()); return;
    }
    setBusy(true);
    try {
      const payload = entityPayload(entity, edit);
      if (payload.image instanceof File) {
        const uploaded = await api.post('/admin/uploads/images', payload.image, { headers: { 'Content-Type': payload.image.type } });
        payload.image = uploaded.data.data.image;
        setEdit(previous => ({ ...previous, image: payload.image }));
      }
      const response = edit._id ? await api.put(`/admin/${entity}/${edit._id}`, payload) : await api.post(`/admin/${entity}`, payload);
      setSuccess(response.data.message); setEdit(null); reload();
      if (entity === 'categories') categories.reload();
    } catch (error) { setFailure(messageOf(error)); }
    finally { setBusy(false); }
  }
  async function destroy() {
    if (busy || !remove) return;
    setBusy(true); setFailure(''); setSuccess('');
    try {
      const response = await api.delete(`/admin/${entity}/${remove._id}`);
      if (edit?._id === remove._id) { setEdit(null); setErrors({}); }
      setSuccess(response.data.message); setRemove(null);
      if (data.items.length === 1 && page > 1) setPage(page - 1); else reload();
      if (entity === 'categories') categories.reload();
    } catch (error) { setRemove(null); setFailure(messageOf(error)); }
    finally { setBusy(false); }
  }
  async function toggle(row) {
    if (busy) return;
    setBusy(true); setFailure(''); setSuccess('');
    try {
      const response = await api.patch(`/admin/${entity}/${row._id}/active`, { isActive: !row.isActive });
      if (edit?._id === row._id) setEdit(previous => ({ ...previous, isActive: response.data.data.isActive }));
      setSuccess(response.data.message); reload();
      if (entity === 'categories') categories.reload();
    } catch (error) { setFailure(messageOf(error)); }
    finally { setBusy(false); }
  }
  return <>
    <div className="page-title"><div><span className="eyebrow">Salon management</span><h1>{config.title}</h1></div><button className="btn small" disabled={busy} onClick={() => start(null)}>+ Add {config.singular}</button></div>
    <Alert>{error || failure || (entity !== 'categories' ? categories.error : '')}</Alert><Alert type="success">{success}</Alert>
    {edit && <form ref={formRef} className="card editor" onSubmit={save} noValidate aria-busy={busy}>
      <h2>{edit._id ? 'Edit' : 'Add'} {config.singular}</h2><p className="muted">Fields marked * are required. Image, description and bio are optional.</p>
      {Object.keys(errors).length > 0 && <Alert>Please correct the highlighted fields before saving.</Alert>}
      <fieldset className="editor-fields" disabled={busy || imageChecking}><div className="grid two">{config.fields.map(([key, label, type, max]) => {
        const value = edit[key] ?? ''; const fieldId = `${prefix}-${key}`; const errorId = `${fieldId}-error`;
        const required = !['image', 'description', 'bio', 'isActive'].includes(key);
        const common = { id: fieldId, name: key, 'aria-invalid': !!errors[key], 'aria-describedby': errors[key] ? errorId : undefined };
        if (type === 'days') return <fieldset key={key} className="field days" aria-describedby={errors[key] ? errorId : undefined}>
          <legend>{label} *</legend>{workingDays.map((day, index) => <label key={day}><input {...(index === 0 ? common : {})} type="checkbox" checked={value.includes(day)} onChange={() => change(key, value.includes(day) ? value.filter(d => d !== day) : [...value, day])}/>{day}</label>)}
          {errors[key] && <small className="field-error" id={errorId}>{errors[key]}</small>}
        </fieldset>;
        return <div key={key} className={`field ${type === 'checkbox' ? 'status-field' : ''}`}>
          <label htmlFor={fieldId}>{label}{required ? ' *' : ''}</label>
          {type === 'image' ? <ImageUpload {...common} value={value} error={errors.image} onChecking={setImageChecking} onError={message => setErrors(previous => ({ ...previous, image: message }))} onChange={file => change(key, file)}/> : type === 'category' ? <select {...common} required value={value} onChange={e => change(key, e.target.value)}><option value="">Choose a category</option>{categories.data?.items.map(category => <option key={category._id} value={category._id}>{category.name}{!category.isActive ? ' (inactive)' : ''}</option>)}</select>
            : type === 'textarea' ? <textarea {...common} value={value} maxLength={max} onChange={e => change(key, e.target.value)}/>
              : type === 'checkbox' ? <div className="status-control"><button {...common} type="button" className="status-switch" role="switch" aria-label={`${config.singular} active`} aria-checked={!!value} onClick={() => change(key, !value)}><span/></button><span>{value ? 'Active' : 'Inactive'}</span></div>
                : <input {...common} type={type} value={value} required={required} maxLength={max} {...(numberRules[key] || {})} inputMode={key === 'phone' ? 'numeric' : undefined} placeholder={key === 'image' ? 'https://example.com/image.jpg' : key === 'phone' ? '10-digit phone number' : undefined} onChange={e => change(key, key === 'code' ? e.target.value.toUpperCase() : e.target.value)}/>}
          {key === 'isActive' && <small className="muted">Inactive records are hidden from new public bookings. Offer dates still apply.</small>}
          {errors[key] && <small className="field-error" id={errorId}>{errors[key]}</small>}
        </div>;
      })}</div><div className="actions"><button className="btn" type="submit">{busy ? 'Saving…' : edit._id ? 'Save Changes' : `Add ${config.singular}`}</button><button type="button" className="btn outline" onClick={() => { setEdit(null); setErrors({}); setFailure(''); }}>Close</button></div></fieldset>
    </form>}
    {loading ? <Loader/> : <div className="table-wrap"><table><thead><tr><th>Name</th><th>Details</th><th>Status</th><th>Actions</th></tr></thead><tbody>{data?.items.map(row => <tr key={row._id}>
      <td data-label="Name"><strong>{row.name || row.title}</strong>{row.code && <small>{row.code}</small>}</td>
      <td data-label="Details">{entity === 'services' ? <>{row.categoryId?.name}<small>{money(row.price)} · {row.duration} min</small></> : entity === 'staff' ? <>{row.categoryId?.name}<small>{row.workingDays.join(', ')} · {row.startTime}–{row.endTime}</small></> : entity === 'offers' ? <>{row.discountPercent}% off<small>{dateLabel(row.validFrom)} – {dateLabel(row.validTo)}</small></> : <span>{row.description}</span>}</td>
      <td data-label="Status"><div className="status-control"><button className="status-switch" role="switch" aria-checked={row.isActive} aria-label={`Active status for ${row.name || row.title}`} disabled={busy} onClick={() => toggle(row)}><span/></button><span>{row.isActive ? 'Active' : 'Inactive'}</span></div></td>
      <td data-label="Actions"><div className="actions"><button className="btn outline small" disabled={busy} onClick={() => start(row)}>Edit</button><button className="btn outline small danger-text" disabled={busy} onClick={() => { setFailure(''); setSuccess(''); setRemove(row); }}>Delete</button></div></td>
    </tr>)}</tbody></table>{data?.total === 0 && <p className="empty-state">No {config.title.toLowerCase()} yet. Add your first one above.</p>}</div>}
    <Pagination page={page} pages={data?.pages || 0} onChange={n => { if (!busy) setPage(n); }}/>
    <ConfirmDialog open={!!remove} title={`Delete ${config.singular.toLowerCase()}?`} busy={busy} onConfirm={destroy} onClose={() => setRemove(null)}>Delete “{remove?.name || remove?.title}” permanently? Records with related bookings cannot be deleted; set them inactive instead.</ConfirmDialog>
  </>;
}

// Shared catalogue editor for categories, services, staff and offers.
