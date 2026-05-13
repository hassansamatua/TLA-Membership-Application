import * as React from 'react';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  /** Render in a compact mode (smaller paddings, no big icon). */
  compact?: boolean;
}

/**
 * Consistent empty-state placeholder used by lists, history widgets,
 * search results, etc. Replaces the various "No data found" snippets
 * with a single visual treatment.
 */
export default function EmptyState({
  icon,
  title,
  description,
  action,
  compact = false,
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center ${
        compact ? 'py-6' : 'py-12'
      }`}
    >
      {icon && (
        <span
          className={`mb-3 flex items-center justify-center rounded-2xl bg-gray-100 text-gray-400 dark:bg-white/5 dark:text-gray-500 ${
            compact ? 'h-10 w-10' : 'h-14 w-14'
          }`}
          aria-hidden="true"
        >
          {icon}
        </span>
      )}
      <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
      {description && (
        <p className="mt-1 max-w-sm text-sm text-gray-500 dark:text-gray-400">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
