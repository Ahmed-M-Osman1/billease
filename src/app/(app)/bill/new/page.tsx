'use client'

import { useBillStore } from '@/stores/bill-store'
import { WizardStepper } from '@/components/wizard/wizard-stepper'
import { StepUpload } from '@/components/wizard/step-upload'
import { StepPeople } from '@/components/wizard/step-people'
import { StepAssign } from '@/components/wizard/step-assign'
import { StepSummary } from '@/components/wizard/step-summary'
import type { WizardStep } from '@/lib/types'

const stepComponents = [StepUpload, StepPeople, StepAssign, StepSummary]

export default function NewBillPage() {
  const { currentStep, setStep } = useBillStore()

  const StepComponent = stepComponents[currentStep]

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">New Bill</h1>
      <WizardStepper
        currentStep={currentStep}
        onStepClick={(step) => setStep(step)}
      />
      <StepComponent />
    </div>
  )
}
