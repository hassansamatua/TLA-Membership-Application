import * as React from 'react';

type Variant = 'card' | 'subtle' | 'inset' | 'flat';
type Padding = 'none' | 'sm' | 'md' | 'lg';

const variants: Record<Variant, string> = {
  card: 'rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-gray-900/60 dark:shadow-black/20',
  subtle: 'rounded-2xl border border-gray-100 bg-gray-50 dark:border-white/5 dark:bg-white/[0.03]',
  inset: 'rounded-xl border border-gray-200 bg-gray-50 dark:border-white/10 dark:bg-white/[0.04]',
  flat: 'rounded-2xl bg-white dark:bg-gray-900/60',
};

const paddings: Record<Padding, string> = {
  none: '',
  sm: 'p-4',
  md: 'p-5 sm:p-6',
  lg: 'p-6 sm:p-8',
};

export interface SurfaceProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: Variant;
  padding?: Padding;
  as?: React.ElementType;
}

/**
 * Unified card-like wrapper used across all dashboard surfaces. Keeps
 * radius / border / shadow consistent with the new checkout aesthetic.
 */
export default function Surface({
  variant = 'card',
  padding = 'md',
  as: Tag = 'div',
  className = '',
  ...rest
}: SurfaceProps) {
  const cls = [variants[variant], paddings[padding], className]
    .filter(Boolean)
    .join(' ');
  return React.createElement(Tag as any, { className: cls, ...rest });
}
