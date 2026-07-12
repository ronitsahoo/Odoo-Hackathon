import { useMemo } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { label as labelCls, errorText } from '../lib/ui.js';

/**
 * Rich text editor wrapping react-quill. Returns sanitized-ish HTML via onChange.
 * Note: Quill escapes pasted markup by default; for defense-in-depth you can run
 * the output through DOMPurify (npm i dompurify) before saving — the server also
 * stores it as-is, so add server-side sanitization for untrusted production use.
 */
const modules = {
  toolbar: [
    ['bold', 'italic', 'underline'],
    [{ header: [1, 2, 3, false] }],
    [{ list: 'ordered' }, { list: 'bullet' }],
    ['link', 'code-block'],
    ['clean'],
  ],
};

export default function RichTextEditor({ label, value, onChange, error, placeholder }) {
  // Stable modules object so Quill doesn't re-init on every render.
  const mods = useMemo(() => modules, []);
  return (
    <div>
      {label && <label className={labelCls}>{label}</label>}
      <ReactQuill
        theme="snow"
        value={value || ''}
        onChange={onChange}
        modules={mods}
        placeholder={placeholder}
      />
      {error && <p className={errorText}>{error}</p>}
    </div>
  );
}
