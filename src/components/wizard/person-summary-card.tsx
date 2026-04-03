'use client'

import { Card, CardContent } from '@/components/ui/card'
import type { CalculatedPersonSummary } from '@/lib/types'
import { getCurrencySymbol } from '@/lib/constants'

interface PersonSummaryCardProps {
  summary: CalculatedPersonSummary
  currency: string
  color?: string
}

export function PersonSummaryCard({ summary, currency, color }: PersonSummaryCardProps) {
  const sym = getCurrencySymbol(currency)

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-3 mb-3">
          <div
            className="h-9 w-9 rounded-full flex items-center justify-center text-white text-sm font-bold"
            style={{ backgroundColor: color ?? '#6366f1' }}
          >
            {summary.name[0]?.toUpperCase()}
          </div>
          <div className="flex-1">
            <p className="font-semibold">{summary.name}</p>
          </div>
          <p className="text-lg font-bold text-primary">
            {sym} {summary.totalDue.toFixed(2)}
          </p>
        </div>

        <div className="space-y-1 text-sm">
          {summary.items.length > 0 && (
            <div className="flex justify-between text-muted-foreground">
              <span>Direct items ({summary.items.length})</span>
              <span>{sym} {summary.itemsSubtotal.toFixed(2)}</span>
            </div>
          )}
          {summary.sharedItemsPortionValue > 0 && (
            <div className="flex justify-between text-muted-foreground">
              <span>Shared items</span>
              <span>{sym} {summary.sharedItemsPortionValue.toFixed(2)}</span>
            </div>
          )}
          {summary.customSharedPoolContributions?.map((contrib) => (
            <div key={contrib.poolId} className="flex justify-between text-muted-foreground">
              <span>{contrib.poolName}</span>
              <span>{sym} {contrib.amount.toFixed(2)}</span>
            </div>
          ))}
          {summary.vatShare > 0 && (
            <div className="flex justify-between text-muted-foreground">
              <span>VAT</span>
              <span>{sym} {summary.vatShare.toFixed(2)}</span>
            </div>
          )}
          {summary.serviceChargeShare > 0 && (
            <div className="flex justify-between text-muted-foreground">
              <span>Service</span>
              <span>{sym} {summary.serviceChargeShare.toFixed(2)}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
