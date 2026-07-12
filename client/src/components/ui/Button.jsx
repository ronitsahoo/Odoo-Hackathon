import { btn } from '../../lib/ui.js';
import { Loader2 } from 'lucide-react';

/**
 * Themed button. variant: primary|secondary|danger|ghost|success. size: sm|md|lg.
 * Shows a spinner and disables itself while `loading` is true.
 */
export default function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  className = '',
  children,
  ...props
}) {
  return (
    <button
      className={`${btn.base} ${btn[variant]} ${btn[size]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Loader2 size={16} className="animate-spin" />}
      {children}
    </button>
  );
}
