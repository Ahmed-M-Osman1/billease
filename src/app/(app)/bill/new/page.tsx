'use client'

import { NewBillWizard } from '@/components/wizard/new-bill-wizard'

export default function NewBillPage() {
  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">New Bill</h1>
      <NewBillWizard />
    </div>
  )
}
