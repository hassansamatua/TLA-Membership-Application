"use client";

import { FiCheck } from 'react-icons/fi';

export interface CheckoutStep {
  id: string;
  label: string;
  description?: string;
}

interface CheckoutStepperProps {
  steps: CheckoutStep[];
  currentIndex: number;
  onStepClick?: (index: number) => void;
}

/**
 * Horizontal progress stepper used at the top of the payment checkout.
 * Past steps are clickable (so the user can go back to edit a selection),
 * future steps are inert. Compact + accessible — labels collapse on
 * narrow viewports.
 */
export default function CheckoutStepper({
  steps,
  currentIndex,
  onStepClick,
}: CheckoutStepperProps) {
  return (
    <ol className="flex items-center w-full" role="list">
      {steps.map((step, idx) => {
        const isComplete = idx < currentIndex;
        const isCurrent = idx === currentIndex;
        const canClick = isComplete && !!onStepClick;
        return (
          <li
            key={step.id}
            className={`flex-1 ${idx < steps.length - 1 ? 'pr-2' : ''}`}
            aria-current={isCurrent ? 'step' : undefined}
          >
            <button
              type="button"
              disabled={!canClick}
              onClick={canClick ? () => onStepClick!(idx) : undefined}
              className={`flex w-full items-center gap-3 ${
                canClick ? 'cursor-pointer hover:opacity-80' : 'cursor-default'
              }`}
            >
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 text-sm font-semibold transition-colors ${
                  isComplete
                    ? 'border-emerald-600 bg-emerald-600 text-white'
                    : isCurrent
                    ? 'border-emerald-600 bg-white dark:bg-gray-900 text-emerald-600'
                    : 'border-gray-300 dark:border-white/15 bg-white dark:bg-gray-900 text-gray-400 dark:text-gray-500'
                }`}
                aria-hidden="true"
              >
                {isComplete ? <FiCheck className="h-4 w-4" /> : idx + 1}
              </span>
              <span className="hidden sm:flex flex-col text-left">
                <span
                  className={`text-sm font-medium ${
                    isCurrent
                      ? 'text-gray-900 dark:text-gray-100'
                      : isComplete
                      ? 'text-gray-700 dark:text-gray-200'
                      : 'text-gray-400 dark:text-gray-500'
                  }`}
                >
                  {step.label}
                </span>
                {step.description && (
                  <span className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500">{step.description}</span>
                )}
              </span>
            </button>
            {idx < steps.length - 1 && (
              <div
                aria-hidden="true"
                className={`h-px w-full mt-3 ${
                  isComplete ? 'bg-emerald-600' : 'bg-gray-200 dark:bg-white/10'
                }`}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
