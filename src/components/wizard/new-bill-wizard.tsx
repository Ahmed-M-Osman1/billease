'use client'

import { useBillStore } from '@/stores/bill-store'
import { WizardStepper } from '@/components/wizard/wizard-stepper'
import { StepUpload } from '@/components/wizard/step-upload'
import { StepPeople } from '@/components/wizard/step-people'
import { StepShare } from '@/components/wizard/step-share'

type NewBillWizardProps = {
  mode?: 'authenticated' | 'guest'
}

const stepComponents = {
  authenticated: [StepUpload, StepPeople, StepShare],
  guest: [StepUpload, StepPeople, StepShare],
} as const

export function NewBillWizard({
  mode = 'authenticated',
}: NewBillWizardProps) {
  const { currentStep, setStep } = useBillStore()
  // Guard against stale persisted state (old wizard had 4 steps, now has 3)
  const safeStep = (currentStep > 2 ? 0 : currentStep) as typeof currentStep
  if (currentStep !== safeStep) setStep(safeStep)
  const StepComponent = stepComponents[mode][safeStep]

  return (
    <div className="space-y-6">
      <WizardStepper
        currentStep={currentStep}
        onStepClick={(step) => setStep(step)}
      />
      <StepComponent />
    </div>
  )
}
