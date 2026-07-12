import { input, label as labelCls, errorText } from '../../lib/ui.js';

/**
 * Labeled select. `options` is an array of { value, label } or plain strings.
 */
export default function Select({ label, error, options = [], className = '', id, ...props }) {
  const inputId = id || props.name;
  return (
    <div className={className}>
      {label && (
        <label htmlFor={inputId} className={labelCls}>
          {label}
        </label>
      )}
      <select id={inputId} className={input} {...props}>
        {options.map((opt) => {
          const value = typeof opt === 'string' ? opt : opt.value;
          const text = typeof opt === 'string' ? opt : opt.label;
          return (
            <option key={value} value={value}>
              {text}
            </option>
          );
        })}
      </select>
      {error && <p className={errorText}>{error}</p>}
    </div>
  );
}
