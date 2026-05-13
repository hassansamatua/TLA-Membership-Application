import * as React from 'react';

interface Breadcrumb {
  label: string;
  href?: string;
}

interface PageHeaderProps {
  title: string;
  description?: React.ReactNode;
  breadcrumbs?: Breadcrumb[];
  icon?: React.ReactNode;
  actions?: React.ReactNode;
  /** Optional eyebrow above the title (e.g. section name). */
  eyebrow?: string;
}

/**
 * Standardised page header used at the top of every dashboard / admin /
 * auth-shell page. Provides a consistent title typography, breadcrumb
 * row, action area, and optional left icon badge.
 */
export default function PageHeader({
  title,
  description,
  breadcrumbs,
  icon,
  actions,
  eyebrow,
}: PageHeaderProps) {
  return (
    <header className="mb-6 sm:mb-8">
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="mb-2 flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400" aria-label="Breadcrumb">
          {breadcrumbs.map((b, i) => (
            <span key={i} className="flex items-center gap-1">
              {b.href ? (
                <a href={b.href} className="hover:text-emerald-700 dark:hover:text-emerald-400">
                  {b.label}
                </a>
              ) : (
                <span className="text-gray-700 dark:text-gray-300">{b.label}</span>
              )}
              {i < breadcrumbs.length - 1 && (
                <span className="text-gray-300 dark:text-gray-600">/</span>
              )}
            </span>
          ))}
        </nav>
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4 min-w-0">
          {icon && (
            <span
              aria-hidden="true"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/20"
            >
              {icon}
            </span>
          )}
          <div className="min-w-0">
            {eyebrow && (
              <p className="text-[11px] font-medium uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
                {eyebrow}
              </p>
            )}
            <h1 className="truncate text-2xl font-semibold text-gray-900 sm:text-3xl dark:text-gray-50">
              {title}
            </h1>
            {description && (
              <p className="mt-1 text-sm text-gray-600 sm:max-w-2xl dark:text-gray-400">
                {description}
              </p>
            )}
          </div>
        </div>

        {actions && (
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {actions}
          </div>
        )}
      </div>
    </header>
  );
}
