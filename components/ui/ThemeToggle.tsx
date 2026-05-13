"use client";

import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { FiSun, FiMoon, FiMonitor } from 'react-icons/fi';

interface ThemeToggleProps {
  /** Compact icon-only variant for tight spaces (topbar). */
  compact?: boolean;
  /** Hide the system option (only Light / Dark). */
  hideSystem?: boolean;
  className?: string;
}

/**
 * Segmented theme switcher: Light · System · Dark. Uses next-themes so it
 * persists in localStorage and honours `prefers-color-scheme` when set
 * to "system". Renders nothing until mounted to avoid hydration flicker.
 */
export default function ThemeToggle({
  compact = false,
  hideSystem = false,
  className = '',
}: ThemeToggleProps) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div
        aria-hidden="true"
        className={`inline-flex h-8 ${compact ? 'w-8' : 'w-24'} rounded-full bg-gray-100 dark:bg-white/5 ${className}`}
      />
    );
  }

  const options: Array<{ value: 'light' | 'system' | 'dark'; label: string; icon: React.ReactNode }> = [
    { value: 'light', label: 'Light', icon: <FiSun className="h-3.5 w-3.5" /> },
    ...(hideSystem
      ? []
      : [{ value: 'system' as const, label: 'System', icon: <FiMonitor className="h-3.5 w-3.5" /> }]),
    { value: 'dark', label: 'Dark', icon: <FiMoon className="h-3.5 w-3.5" /> },
  ];

  if (compact) {
    // Single button that cycles light → dark.
    const next = resolvedTheme === 'dark' ? 'light' : 'dark';
    return (
      <button
        type="button"
        aria-label={`Switch to ${next} mode`}
        onClick={() => setTheme(next)}
        className={`inline-flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-600 transition-colors hover:bg-gray-50 dark:border-white/10 dark:bg-white/5 dark:text-gray-300 dark:hover:bg-white/10 ${className}`}
      >
        {resolvedTheme === 'dark' ? <FiSun className="h-4 w-4" /> : <FiMoon className="h-4 w-4" />}
      </button>
    );
  }

  return (
    <div
      role="radiogroup"
      aria-label="Theme"
      className={`inline-flex items-center gap-0.5 rounded-full border border-gray-200 bg-white p-0.5 dark:border-white/10 dark:bg-white/5 ${className}`}
    >
      {options.map((opt) => {
        const active = theme === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={opt.label}
            onClick={() => setTheme(opt.value)}
            className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
              active
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100'
            }`}
          >
            {opt.icon}
            <span className="hidden sm:inline">{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}
