'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Receipt, TrendingUp, Calculator, Users } from 'lucide-react'
import { getCurrencySymbol } from '@/lib/constants'

interface StatsRowProps {
  billCount: number
  totalSpent: number
  avgBill: number
  currency: string
}

export function StatsRow({ billCount, totalSpent, avgBill, currency }: StatsRowProps) {
  const symbol = getCurrencySymbol(currency)

  const stats = [
    {
      label: 'Bills this month',
      value: billCount.toString(),
      icon: Receipt,
      color: 'text-blue-500',
      bg: 'bg-blue-50 dark:bg-blue-950',
    },
    {
      label: 'Total spent',
      value: `${symbol} ${totalSpent.toFixed(0)}`,
      icon: TrendingUp,
      color: 'text-green-500',
      bg: 'bg-green-50 dark:bg-green-950',
    },
    {
      label: 'Average bill',
      value: `${symbol} ${avgBill.toFixed(0)}`,
      icon: Calculator,
      color: 'text-amber-500',
      bg: 'bg-amber-50 dark:bg-amber-950',
    },
    {
      label: 'Friends',
      value: '—',
      icon: Users,
      color: 'text-violet-500',
      bg: 'bg-violet-50 dark:bg-violet-950',
    },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => {
        const Icon = stat.icon
        return (
          <Card key={stat.label}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${stat.bg}`}>
                  <Icon className={`h-5 w-5 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
