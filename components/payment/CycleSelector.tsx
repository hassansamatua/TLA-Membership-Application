"use client";

import { FiCalendar, FiCheckCircle, FiLock } from 'react-icons/fi';

export interface CyclePricingRow {
  cycleYear: number;
  baseAmount: number;
  penaltyAmount: number;
  totalDue: number;
  isPaid: boolean;
  isCurrent: boolean;
  isFuture: boolean;
  label: string;
}

interface CycleSelectorProps {
  cycles: CyclePricingRow[];
  selectedYears: number[];
  onToggle: (cycleYear: number) => void;
  /** Hard cap on how many cycles can be selected at once. */
  maxSelectable?: number;
}

/**
 * Card-list of cycles the user can pay for. Paid cycles render as a
 * muted, locked row that clearly stands apart from the unpaid options.
 * Unpaid current/future cycles are interactive. No discount is applied
 * for prepaying — every cycle shows its full base + penalty breakdown.
 */
export default function CycleSelector({
  cycles,
  selectedYears,
  onToggle,
  maxSelectable = 3,
}: CycleSelectorProps) {
  const selectedSet = new Set(selectedYears);
  const selectableCycles = cycles.filter((c) => !c.isPaid);
  const selectableCount = selectableCycles.length;
  const allPaid = cycles.length > 0 && selectableCount === 0;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
          Select cycle(s) to pay for
        </h2>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {allPaid
            ? 'All cycles paid'
            : `${selectedYears.length} of ${Math.min(selectableCount, maxSelectable)} selected`}
        </span>
      </div>

      {allPaid ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-5 text-center dark:border-emerald-500/30 dark:bg-emerald-500/5">
          <span className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
            <FiCheckCircle className="h-5 w-5" />
          </span>
          <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-200">
            You're paid up through {cycles[cycles.length - 1].cycleYear + 1}
          </p>
          <p className="mt-1 text-xs text-emerald-800/80 dark:text-emerald-300/80">
            Every cycle currently visible is already settled. New cycles open for payment when they
            start each February.
          </p>
        </div>
      ) : (
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Pay just the current cycle or prepay up to {maxSelectable - 1} future cycles in one
          transaction. Every cycle is charged in full — no discount, no surprises.
        </p>
      )}

      <div className="space-y-2">
        {cycles.map((cycle) => {
          const isSelected = selectedSet.has(cycle.cycleYear);
          const disabled = cycle.isPaid;
          const reachedCap =
            !isSelected && !disabled && selectedYears.length >= maxSelectable;

          return (
            <button
              key={cycle.cycleYear}
              type="button"
              disabled={disabled || reachedCap}
              onClick={() => onToggle(cycle.cycleYear)}
              className={`group flex w-full items-center gap-4 rounded-2xl border p-4 text-left transition-all ${
                disabled
                  ? 'cursor-not-allowed border-gray-200 bg-white dark:border-white/10 dark:bg-white/[0.03]'
                  : reachedCap
                  ? 'cursor-not-allowed border-gray-200 bg-white opacity-60 dark:border-white/10 dark:bg-gray-900'
                  : isSelected
                  ? 'border-emerald-500 bg-emerald-50 shadow-sm dark:border-emerald-500/60 dark:bg-emerald-500/10'
                  : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm dark:border-white/10 dark:bg-gray-900 dark:hover:border-white/20'
              }`}
            >
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                  disabled
                    ? 'bg-gray-100 text-gray-400 dark:bg-white/5 dark:text-gray-500'
                    : isSelected
                    ? 'bg-emerald-600 text-white'
                    : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300'
                }`}
                aria-hidden="true"
              >
                {disabled ? (
                  <FiLock className="h-5 w-5" />
                ) : isSelected ? (
                  <FiCheckCircle className="h-5 w-5" />
                ) : (
                  <FiCalendar className="h-5 w-5" />
                )}
              </span>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p
                    className={`font-semibold ${
                      disabled
                        ? 'text-gray-500 dark:text-gray-400'
                        : 'text-gray-900 dark:text-gray-100'
                    }`}
                  >
                    Cycle {cycle.cycleYear}
                  </p>
                  {disabled ? (
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:ring-emerald-500/30">
                      Paid
                    </span>
                  ) : (
                    <>
                      {cycle.isCurrent && (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                          Current
                        </span>
                      )}
                      {cycle.isFuture && (
                        <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-medium text-blue-700 dark:bg-blue-500/15 dark:text-blue-300">
                          Prepay
                        </span>
                      )}
                    </>
                  )}
                </div>
                <p
                  className={`text-xs ${
                    disabled
                      ? 'text-gray-400 dark:text-gray-500'
                      : 'text-gray-500 dark:text-gray-400'
                  }`}
                >
                  {cycle.label}
                </p>
                {!disabled && cycle.penaltyAmount > 0 && (
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                    Includes TZS {cycle.penaltyAmount.toLocaleString()} late penalty
                  </p>
                )}
              </div>

              <div className="text-right">
                <p
                  className={`text-sm font-semibold ${
                    disabled
                      ? 'text-gray-400 line-through dark:text-gray-500'
                      : 'text-gray-900 dark:text-gray-100'
                  }`}
                >
                  TZS {cycle.totalDue.toLocaleString()}
                </p>
                {!disabled && cycle.penaltyAmount > 0 && (
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">
                    base {cycle.baseAmount.toLocaleString()} + pen {cycle.penaltyAmount.toLocaleString()}
                  </p>
                )}
                {disabled && (
                  <p className="text-[11px] text-emerald-700 dark:text-emerald-300">Settled</p>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
