import * as React from 'react';

type Tone =
  | 'emerald'
  | 'red'
  | 'amber'
  | 'blue'
  | 'gray'
  | 'purple'
  | 'indigo';

const tones: Record<Tone, string> = {
  emerald:
    'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/30',
  red:
    'bg-red-50 text-red-700 ring-red-200 dark:bg-red-500/10 dark:text-red-300 dark:ring-red-500/30',
  amber:
    'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/30',
  blue:
    'bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:ring-blue-500/30',
  gray:
    'bg-gray-100 text-gray-700 ring-gray-200 dark:bg-white/5 dark:text-gray-300 dark:ring-white/10',
  purple:
    'bg-purple-50 text-purple-700 ring-purple-200 dark:bg-purple-500/10 dark:text-purple-300 dark:ring-purple-500/30',
  indigo:
    'bg-indigo-50 text-indigo-700 ring-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-300 dark:ring-indigo-500/30',
};

interface StatusBadgeProps {
  children: React.ReactNode;
  tone?: Tone;
  icon?: React.ReactNode;
  size?: 'sm' | 'md';
}

/**
 * Pill-shaped status indicator used across all dashboard / admin screens.
 * Consistent palette + sizing replaces the dozens of one-off pill styles.
 */
export default function StatusBadge({
  children,
  tone = 'gray',
  icon,
  size = 'sm',
}: StatusBadgeProps) {
  const sz =
    size === 'sm'
      ? 'px-2 py-0.5 text-[11px]'
      : 'px-2.5 py-1 text-xs';
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-medium ring-1 ${tones[tone]} ${sz}`}
    >
      {icon}
      {children}
    </span>
  );
}
