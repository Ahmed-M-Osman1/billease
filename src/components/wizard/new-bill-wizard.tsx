'use client'

import { useBillStore } from '@/stores/bill-store'
import { WizardStepper } from '@/components/wizard/wizard-stepper'
import { StepUpload } from '@/components/wizard/step-upload'
import { StepPeople } from '@/components/wizard/step-people'
import { StepAssign } from '@/components/wizard/step-assign'
import { StepSummary } from '@/components/wizard/step-summary'

type NewBillWizardProps = {
  mode?: 'authenticated' | 'guest'
}

const stepComponents = {
  authenticated: [StepUpload, StepPeople, StepAssign, StepSummary],
  guest: [StepUpload, StepPeople, StepAssign, () => <StepSummary mode="guest" />],
} as const

export function NewBillWizard({
  mode = 'authenticated',
}: NewBillWizardProps) {
  const { currentStep, setStep } = useBillStore()
  const StepComponent = stepComponents[mode][currentStep]

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
