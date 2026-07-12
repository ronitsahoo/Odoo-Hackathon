import { card, cardPad } from '../../lib/ui.js';

/** Rounded, shadowed surface. Set padded={false} to control padding yourself. */
export default function Card({ padded = true, className = '', children, ...props }) {
  return (
    <div className={`${card} ${padded ? cardPad : ''} ${className}`} {...props}>
      {children}
    </div>
  );
}
