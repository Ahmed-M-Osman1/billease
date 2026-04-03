'use client'

import { cn } from '@/lib/utils'
import { WIZARD_STEPS } from '@/lib/constants'
import { Check } from 'lucide-react'
import type { WizardStep } from '@/lib/types'

interface WizardStepperProps {
  currentStep: WizardStep
  onStepClick?: (step: WizardStep) => void
}

export function WizardStepper({ currentStep, onStepClick }: WizardStepperProps) {
  return (
    <div className="flex items-center justify-center gap-0 mb-6">
      {WIZARD_STEPS.map((step, i) => {
        const isCompleted = i < currentStep
        const isCurrent = i === currentStep
        const isFuture = i > currentStep

        return (
          <div key={step.index} className="flex items-center">
            {/* Step circle */}
            <button
              onClick={() => isCompleted && onStepClick?.(step.index as WizardStep)}
              disabled={isFuture}
              className={cn(
                'flex flex-col items-center',
                isCompleted && 'cursor-pointer',
                isFuture && 'cursor-default'
              )}
            >
              <div
                className={cn(
                  'flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold transition-colors',
                  isCompleted && 'bg-primary text-primary-foreground',
                  isCurrent && 'bg-primary text-primary-foreground ring-4 ring-primary/20',
                  isFuture && 'bg-muted text-muted-foreground'
                )}
              >
                {isCompleted ? <Check className="h-4 w-4" /> : i + 1}
              </div>
              <span
                className={cn(
                  'mt-1.5 text-xs font-medium',
                  (isCompleted || isCurrent) && 'text-primary',
                  isFuture && 'text-muted-foreground'
                )}
              >
                {step.label}
              </span>
            </button>

            {/* Connector line */}
            {i < WIZARD_STEPS.length - 1 && (
              <div
                className={cn(
                  'mx-2 h-0.5 w-8 sm:w-16 transition-colors',
                  i < currentStep ? 'bg-primary' : 'bg-muted'
                )}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
