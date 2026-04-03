'use client'

import { useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useBillStore } from '@/stores/bill-store'
import { useAuthStore } from '@/stores/auth-store'
import { calculatePersonSummaries } from '@/lib/calculations'
import { getCurrencySymbol } from '@/lib/constants'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { PersonSummaryCard } from './person-summary-card'
import { TipCalculator } from './tip-calculator'
import { BillChart } from './bill-chart'
import { ExportActions } from './export-actions'
import { WizardNavigation } from './wizard-navigation'
import { useToast } from '@/hooks/use-toast'
import { Save, Loader2, PlusCircle } from 'lucide-react'

export function StepSummary() {
  const store = useBillStore()
  const { user } = useAuthStore()
  const router = useRouter()
  const { toast } = useToast()
  const [saving, setSaving] = useState(false)
  const captureRef = useRef<HTMLDivElement>(null)

  const { summaries, grandTotal } = useMemo(
    () =>
      calculatePersonSummaries({
        items: store.items,
        people: store.people,
        billDetails: store.billDetails,
        customSharedPools: store.customSharedPools,
        tipAmount: store.tipAmount,
        tipMode: store.tipMode,
      }),
    [store.items, store.people, store.billDetails, store.customSharedPools, store.tipAmount, store.tipMode]
  )

  const sym = getCurrencySymbol(store.currency)

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/bills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: store.billTitle,
          date: store.billDate,
          currency: store.currency,
          subtotal: store.billDetails.subtotal,
          vat: store.billDetails.vat,
          serviceCharge: store.billDetails.serviceCharge,
          delivery: store.billDetails.delivery,
          tip: store.tipAmount,
          tipMode: store.tipMode,
          items: store.items,
          people: store.people,
          customSharedPools: store.customSharedPools,
        }),
      })
      const bill = await res.json()
      if (!res.ok) throw new Error(bill.error ?? 'Save failed')
      toast({ title: 'Bill saved!' })
      store.resetAll()
      router.push(`/bill/${bill.id}`)
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Failed to save', description: err.message })
    } finally {
      setSaving(false)
    }
  }

  const handleNewBill = () => {
    store.resetAll()
    router.push('/bill/new')
  }

  return (
    <div className="space-y-6">
      <TipCalculator />

      <Separator />

      {/* Chart */}
      {summaries.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Bill Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <BillChart summaries={summaries} currency={store.currency} />
          </CardContent>
        </Card>
      )}

      {/* Per-person breakdowns */}
      <div ref={captureRef} className="space-y-3">
        <h3 className="font-semibold">Per-person Breakdown</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          {summaries.map((summary, i) => (
            <PersonSummaryCard
              key={summary.id}
              summary={summary}
              currency={store.currency}
              color={(store.people[i] as any)?.color}
            />
          ))}
        </div>

        {/* Totals */}
        <Card className="bg-muted/30">
          <CardContent className="p-4">
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>{sym} {store.billDetails.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>VAT</span>
                <span>{sym} {store.billDetails.vat.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Service</span>
                <span>{sym} {store.billDetails.serviceCharge.toFixed(2)}</span>
              </div>
              {store.billDetails.delivery > 0 && (
                <div className="flex justify-between">
                  <span>Delivery</span>
                  <span>{sym} {store.billDetails.delivery.toFixed(2)}</span>
                </div>
              )}
              {store.tipAmount > 0 && (
                <div className="flex justify-between">
                  <span>Tip</span>
                  <span>{sym} {store.tipAmount.toFixed(2)}</span>
                </div>
              )}
              <Separator className="my-2" />
              <div className="flex justify-between font-bold text-base">
                <span>Grand Total</span>
                <span className="text-primary">{sym} {grandTotal.toFixed(2)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Export + actions */}
      <div className="flex flex-wrap items-center gap-3">
        <ExportActions
          summaries={summaries}
          currency={store.currency}
          billTitle={store.billTitle}
          captureRef={captureRef}
        />
        <div className="ml-auto flex gap-2">
          <Button variant="outline" onClick={handleNewBill}>
            <PlusCircle className="h-4 w-4 mr-1" />
            New Bill
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-1" />
            )}
            Save Bill
          </Button>
        </div>
      </div>

      <WizardNavigation
        canGoBack={true}
        canGoNext={false}
        onBack={() => store.prevStep()}
        onNext={() => {}}
      />
    </div>
  )
}
