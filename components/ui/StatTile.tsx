import * as React from 'react';

interface StatTileProps {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  icon?: React.ReactNode;
  /** Optional accent color for the value. */
  tone?: 'default' | 'emerald' | 'red' | 'amber' | 'blue';
}

const tones: Record<NonNullable<StatTileProps['tone']>, string> = {
  default: 'text-gray-900 dark:text-gray-50',
  emerald: 'text-emerald-700 dark:text-emerald-300',
  red: 'text-red-600 dark:text-red-400',
  amber: 'text-amber-700 dark:text-amber-300',
  blue: 'text-blue-700 dark:text-blue-300',
};

/**
 * Inline metric tile used in dashboard summary rows. Replaces the
 * `bg-gray-50 rounded-md p-4` blocks scattered across the codebase.
 */
export default function StatTile({
  label,
  value,
  hint,
  icon,
  tone = 'default',
}: StatTileProps) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-gray-50/60 p-4 transition-colors hover:bg-gray-50 dark:border-white/5 dark:bg-white/[0.03] dark:hover:bg-white/[0.05]">
      <div className="flex items-center gap-2">
        {icon && (
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white text-emerald-600 ring-1 ring-gray-200 dark:bg-white/5 dark:text-emerald-300 dark:ring-white/10">
            {icon}
          </span>
        )}
        <span className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
          {label}
        </span>
      </div>
      <div className={`mt-2 text-xl font-semibold ${tones[tone]}`}>{value}</div>
      {hint && <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">{hint}</div>}
    </div>
  );
}
