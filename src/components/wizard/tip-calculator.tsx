'use client'

import { useBillStore } from '@/stores/bill-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { TIP_PRESETS } from '@/lib/constants'
import type { TipMode } from '@/lib/types'
import { cn } from '@/lib/utils'

export function TipCalculator() {
  const { tipMode, tipAmount, tipPercentage, billDetails, setTipMode, setTipAmount, setTipPercentage } =
    useBillStore()

  const subtotal = billDetails.subtotal || 0
  const total = subtotal + billDetails.vat + billDetails.serviceCharge

  const handleModeChange = (mode: TipMode) => {
    setTipMode(mode)
    if (mode === 'none') {
      setTipAmount(0)
      setTipPercentage(0)
    }
  }

  const handlePreset = (pct: number) => {
    setTipPercentage(pct)
    const base = tipMode === 'pre_tax' ? subtotal : total
    setTipAmount(parseFloat((base * pct / 100).toFixed(2)))
  }

  const handleCustomAmount = (amount: number) => {
    setTipAmount(amount)
    setTipPercentage(0)
  }

  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium">Tip</Label>
      <div className="flex gap-2">
        {(['none', 'pre_tax', 'post_tax'] as TipMode[]).map((mode) => (
          <Button
            key={mode}
            variant={tipMode === mode ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleModeChange(mode)}
          >
            {mode === 'none' ? 'No tip' : mode === 'pre_tax' ? 'Pre-tax' : 'Post-tax'}
          </Button>
        ))}
      </div>

      {tipMode !== 'none' && (
        <div className="space-y-2">
          <div className="flex gap-2">
            {TIP_PRESETS.map((pct) => (
              <Button
                key={pct}
                variant={tipPercentage === pct ? 'default' : 'outline'}
                size="sm"
                className="flex-1"
                onClick={() => handlePreset(pct)}
              >
                {pct}%
              </Button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-xs shrink-0">Custom:</Label>
            <Input
              type="number"
              value={tipAmount || ''}
              onChange={(e) => handleCustomAmount(parseFloat(e.target.value) || 0)}
              placeholder="Amount"
              className="w-32 text-right"
            />
          </div>
        </div>
      )}
    </div>
  )
}
