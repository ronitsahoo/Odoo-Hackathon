import { input, label as labelCls, errorText } from '../../lib/ui.js';

/** Labeled textarea with inline error message. */
export default function Textarea({ label, error, className = '', id, rows = 4, ...props }) {
  const inputId = id || props.name;
  return (
    <div className={className}>
      {label && (
        <label htmlFor={inputId} className={labelCls}>
          {label}
        </label>
      )}
      <textarea id={inputId} rows={rows} className={input} {...props} />
      {error && <p className={errorText}>{error}</p>}
    </div>
  );
}
