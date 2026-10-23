import { useEffect, useRef, useState } from 'react';
import { imageSource, fallbackImage } from '../utils/images';
import { validateImageFile } from '../utils/entityValidation';

export default function ImageUpload({ value, onChange, onError, onChecking, error, ...inputProps }) {
  const input = useRef(null);
  const [preview, setPreview] = useState('');
  const [checking, setChecking] = useState(false);
  const [localError, setLocalError] = useState('');
  useEffect(() => {
    setLocalError('');
    if (!(value instanceof File)) { setPreview(imageSource(value)); if (input.current) input.current.value = ''; return; }
    const url = URL.createObjectURL(value); setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [value]);
  async function select(event) {
    const file = event.target.files?.[0]; if (!file) return;
    const failure = validateImageFile(file);
    if (failure) { setLocalError(failure); onError(failure); event.target.value = ''; return; }
    setChecking(true); onChecking(true);
    try {
      const bitmap = await createImageBitmap(file);
      const valid = bitmap.width > 0 && bitmap.height > 0 && bitmap.width <= 12000 && bitmap.height <= 12000;
      bitmap.close();
      if (!valid) throw new Error('Invalid dimensions');
      setLocalError(''); onChange(file);
    } catch { const message = 'This image could not be opened. Choose another JPG, PNG or WebP image.'; setLocalError(message); onError(message); if (input.current) input.current.value = ''; }
    finally { setChecking(false); onChecking(false); }
  }
  return <div className="image-upload">
    <input {...inputProps} ref={input} type="file" accept="image/jpeg,image/png,image/webp" onChange={select} aria-invalid={!!(error || localError)}/>
    <small className="muted">JPG, PNG or WebP · up to 2 MB. Choose a new file to replace the current image.</small>
    {checking && <small role="status">Checking image…</small>}
    {localError && <small className="field-error" role="alert">{localError}</small>}
    {preview && <div className="image-preview"><img src={preview} alt="Selected image preview" loading="lazy" onError={fallbackImage}/><button type="button" className="text-button danger-text" onClick={() => { setLocalError(''); onChange(''); }}>Remove image</button></div>}
  </div>;
}
