'use client'

import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface WizardNavigationProps {
  canGoBack: boolean
  canGoNext: boolean
  onBack: () => void
  onNext: () => void
  nextLabel?: string
  isLoading?: boolean
}

export function WizardNavigation({
  canGoBack,
  canGoNext,
  onBack,
  onNext,
  nextLabel = 'Next',
  isLoading = false,
}: WizardNavigationProps) {
  return (
    <div className="flex justify-between pt-6">
      <Button
        variant="outline"
        onClick={onBack}
        disabled={!canGoBack}
        className="gap-1"
      >
        <ChevronLeft className="h-4 w-4" />
        Back
      </Button>
      <Button
        onClick={onNext}
        disabled={!canGoNext || isLoading}
        className="gap-1"
      >
        {nextLabel}
        {nextLabel === 'Next' && <ChevronRight className="h-4 w-4" />}
      </Button>
    </div>
  )
}
