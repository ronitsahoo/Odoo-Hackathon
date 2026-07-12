import { input, label as labelCls, errorText } from '../../lib/ui.js';

/** Labeled text input with inline error message. */
export default function Input({ label, error, className = '', id, ...props }) {
  const inputId = id || props.name;
  return (
    <div className={className}>
      {label && (
        <label htmlFor={inputId} className={labelCls}>
          {label}
        </label>
      )}
      <input id={inputId} className={input} {...props} />
      {error && <p className={errorText}>{error}</p>}
    </div>
  );
}
