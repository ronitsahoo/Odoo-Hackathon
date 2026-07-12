/**
 * Shared Tailwind class constants = the design system in one file.
 * Every UI primitive pulls from here so spacing, radius, colour and states stay
 * consistent everywhere. Re-theme the app by editing these strings (+ the brand
 * colour in tailwind.config.js).
 */

// Button variants
export const btn = {
  base: 'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition focus:outline-none focus:ring-2 focus:ring-brand-500/40 disabled:opacity-50 disabled:cursor-not-allowed',
  primary: 'bg-brand-600 text-white hover:bg-brand-700',
  secondary: 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50',
  danger: 'bg-red-600 text-white hover:bg-red-700',
  ghost: 'text-slate-600 hover:bg-slate-100',
  success: 'bg-emerald-600 text-white hover:bg-emerald-700',
  // sizes
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
  lg: 'px-5 py-2.5 text-base',
};

// Form controls
export const input =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm placeholder-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 focus:outline-none transition';

export const label = 'block text-sm font-medium text-slate-700 mb-1';
export const errorText = 'text-sm text-red-600 mt-1';

// Containers
export const card = 'bg-white rounded-xl shadow-card border border-slate-100';
export const cardPad = 'p-5';

// Badges (status-agnostic base; StatusBadge maps colours per status)
export const badge =
  'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium';

// Status colour map — reused by StatusBadge and anywhere a status is shown.
export const statusColors = {
  // Item/Request statuses
  pending: 'bg-amber-100 text-amber-700',
  approved: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-red-100 text-red-700',
  accepted: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-slate-100 text-slate-600',
  completed: 'bg-brand-100 text-brand-700',
  // Asset lifecycle statuses
  Available: 'bg-emerald-100 text-emerald-700',
  Allocated: 'bg-blue-100 text-blue-700',
  Reserved: 'bg-purple-100 text-purple-700',
  'Under Maintenance': 'bg-amber-100 text-amber-700',
  Lost: 'bg-red-100 text-red-700',
  Retired: 'bg-slate-100 text-slate-600',
  Disposed: 'bg-slate-100 text-slate-600',
};
