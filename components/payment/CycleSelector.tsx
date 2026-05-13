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
 * Card-list of cycles the user can pay for. The current unpaid cycle is
 * always preselected (and required) so a user can never deselect their
 * own due-now cycle while still picking future cycles. Paid cycles are
 * shown disabled with a "paid" badge.
 *
 * No discount is applied for prepaying multiple cycles — every cycle
 * shows its full base + penalty total separately so the user knows
 * exactly what they're paying for.
 */
export default function CycleSelector({
  cycles,
  selectedYears,
  onToggle,
  maxSelectable = 3,
}: CycleSelectorProps) {
  const selectedSet = new Set(selectedYears);
  const selectableCount = cycles.filter((c) => !c.isPaid).length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-900">Select cycle(s) to pay for</h2>
        <span className="text-xs text-gray-500">
          {selectedYears.length} of {Math.min(selectableCount, maxSelectable)} selected
        </span>
      </div>
      <p className="text-sm text-gray-600">
        Pay just the current cycle or prepay up to {maxSelectable - 1} future cycles in one
        transaction. Every cycle is charged in full — no discount, no surprises.
      </p>

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
                  ? 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-70'
                  : reachedCap
                  ? 'border-gray-200 bg-white cursor-not-allowed opacity-50'
                  : isSelected
                  ? 'border-emerald-500 bg-emerald-50 shadow-sm'
                  : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
              }`}
            >
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                  disabled
                    ? 'bg-gray-200 text-gray-500'
                    : isSelected
                    ? 'bg-emerald-600 text-white'
                    : 'bg-emerald-50 text-emerald-600'
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
                  <p className="font-semibold text-gray-900">Cycle {cycle.cycleYear}</p>
                  {cycle.isCurrent && (
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                      Current
                    </span>
                  )}
                  {cycle.isFuture && (
                    <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-medium text-blue-700">
                      Prepay
                    </span>
                  )}
                  {disabled && (
                    <span className="rounded-full bg-gray-200 px-2 py-0.5 text-[11px] font-medium text-gray-600">
                      Paid
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500">{cycle.label}</p>
                {cycle.penaltyAmount > 0 && (
                  <p className="mt-1 text-xs text-red-600">
                    Includes TZS {cycle.penaltyAmount.toLocaleString()} late penalty
                  </p>
                )}
              </div>

              <div className="text-right">
                <p className="text-sm font-semibold text-gray-900">
                  TZS {cycle.totalDue.toLocaleString()}
                </p>
                {cycle.penaltyAmount > 0 && (
                  <p className="text-[11px] text-gray-500">
                    base {cycle.baseAmount.toLocaleString()} + pen {cycle.penaltyAmount.toLocaleString()}
                  </p>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
