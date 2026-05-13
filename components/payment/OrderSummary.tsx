"use client";

import { useState } from 'react';
import { FiChevronUp, FiShield } from 'react-icons/fi';
import type { CyclePricingRow } from './CycleSelector';

interface OrderSummaryProps {
  cycles: CyclePricingRow[];
  selectedYears: number[];
  providerLabel?: string | null;
  ctaLabel: string;
  ctaDisabled?: boolean;
  ctaLoading?: boolean;
  onCta: () => void;
}

/**
 * Sticky order summary. On desktop renders as a right-rail card; on
 * mobile collapses into a bottom sheet with a "Total + chevron" bar
 * that expands the full breakdown on tap.
 */
export default function OrderSummary({
  cycles,
  selectedYears,
  providerLabel,
  ctaLabel,
  ctaDisabled,
  ctaLoading,
  onCta,
}: OrderSummaryProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const selected = cycles.filter((c) => selectedYears.includes(c.cycleYear));
  const subtotal = selected.reduce((s, c) => s + c.baseAmount, 0);
  const penalty = selected.reduce((s, c) => s + c.penaltyAmount, 0);
  const total = subtotal + penalty;

  const Body = (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold text-gray-900">Order summary</h3>
        <p className="text-xs text-gray-500">
          {selected.length} cycle{selected.length === 1 ? '' : 's'} selected
        </p>
      </div>

      <dl className="space-y-3 text-sm">
        {selected.length === 0 && (
          <p className="text-sm text-gray-500">
            Select at least one cycle to continue.
          </p>
        )}
        {selected.map((c) => (
          <div key={c.cycleYear} className="space-y-1 border-b border-dashed border-gray-200 pb-3 last:border-0 last:pb-0">
            <div className="flex justify-between">
              <dt className="font-medium text-gray-900">Cycle {c.cycleYear}</dt>
              <dd className="font-medium text-gray-900">
                TZS {c.totalDue.toLocaleString()}
              </dd>
            </div>
            <div className="flex justify-between text-xs text-gray-500">
              <dt>Base fee</dt>
              <dd>TZS {c.baseAmount.toLocaleString()}</dd>
            </div>
            {c.penaltyAmount > 0 && (
              <div className="flex justify-between text-xs text-red-600">
                <dt>Late penalty</dt>
                <dd>TZS {c.penaltyAmount.toLocaleString()}</dd>
              </div>
            )}
          </div>
        ))}
      </dl>

      {selected.length > 0 && (
        <div className="border-t border-gray-200 pt-3">
          <div className="flex justify-between text-sm text-gray-600">
            <span>Subtotal</span>
            <span>TZS {subtotal.toLocaleString()}</span>
          </div>
          {penalty > 0 && (
            <div className="flex justify-between text-sm text-red-600">
              <span>Penalty</span>
              <span>TZS {penalty.toLocaleString()}</span>
            </div>
          )}
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-sm font-medium text-gray-900">Total</span>
            <span className="text-2xl font-bold text-gray-900">
              TZS {total.toLocaleString()}
            </span>
          </div>
        </div>
      )}

      <button
        type="button"
        disabled={ctaDisabled || selected.length === 0 || ctaLoading}
        onClick={onCta}
        className={`w-full rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-sm transition-all ${
          ctaDisabled || selected.length === 0 || ctaLoading
            ? 'bg-gray-300 cursor-not-allowed'
            : 'bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99]'
        }`}
      >
        {ctaLoading ? 'Processing…' : ctaLabel}
        {providerLabel && !ctaLoading && (
          <span className="ml-1 font-normal opacity-90">via {providerLabel}</span>
        )}
      </button>

      <p className="flex items-center justify-center gap-1.5 text-[11px] text-gray-500">
        <FiShield className="h-3 w-3" />
        Secured by AzamPay · Tanzania Library Association
      </p>
    </div>
  );

  return (
    <>
      {/* Desktop: sticky right rail */}
      <aside className="hidden lg:block lg:sticky lg:top-6 h-fit">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          {Body}
        </div>
      </aside>

      {/* Mobile: bottom sheet (collapsed bar with peek + expand on tap) */}
      <div className="lg:hidden">
        {/* Compact bar */}
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="fixed bottom-0 inset-x-0 z-30 flex items-center justify-between gap-4 border-t border-gray-200 bg-white px-4 py-3 shadow-[0_-4px_12px_rgba(0,0,0,0.04)]"
        >
          <span className="flex flex-col text-left">
            <span className="text-[11px] uppercase tracking-wide text-gray-500">Total</span>
            <span className="text-lg font-bold text-gray-900">
              TZS {total.toLocaleString()}
            </span>
          </span>
          <span className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white">
            Review
            <FiChevronUp className="h-4 w-4" />
          </span>
        </button>

        {/* Sheet overlay */}
        {mobileOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/40"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
        )}
        <div
          className={`fixed inset-x-0 bottom-0 z-50 rounded-t-2xl bg-white p-5 shadow-2xl transition-transform duration-200 ${
            mobileOpen ? 'translate-y-0' : 'translate-y-full'
          }`}
          aria-hidden={!mobileOpen}
        >
          <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-gray-300" />
          {Body}
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="mt-3 w-full rounded-xl border border-gray-200 px-4 py-2 text-sm text-gray-600"
          >
            Close
          </button>
        </div>
      </div>
    </>
  );
}
