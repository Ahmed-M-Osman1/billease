'use client'

import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Receipt } from 'lucide-react'
import { getCurrencySymbol } from '@/lib/constants'
import { format } from 'date-fns'

interface BillWithParticipants {
  id: string
  title: string
  date: string
  currency: string
  subtotal: number
  vat: number
  service_charge: number
  delivery: number
  tip: number
  status: string
  bill_participants: Array<{ id: string; name: string; color: string | null }>
}

interface RecentBillsProps {
  bills: BillWithParticipants[]
}

export function RecentBills({ bills }: RecentBillsProps) {
  if (bills.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent Bills</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Receipt className="h-12 w-12 text-muted-foreground/50 mb-3" />
            <p className="text-sm text-muted-foreground">No bills yet. Start by splitting your first bill!</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Recent Bills</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {bills.map((bill) => {
          const total = bill.subtotal + bill.vat + bill.service_charge + bill.delivery + bill.tip
          const symbol = getCurrencySymbol(bill.currency)
          return (
            <Link
              key={bill.id}
              href={`/bill/${bill.id}`}
              className="flex items-center gap-3 rounded-lg p-3 transition-colors hover:bg-muted/50"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Receipt className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{bill.title}</p>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(bill.date), 'MMM d, yyyy')}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex -space-x-2">
                  {bill.bill_participants.slice(0, 3).map((p) => (
                    <Avatar key={p.id} className="h-6 w-6 border-2 border-background">
                      <AvatarFallback
                        className="text-[10px]"
                        style={{ backgroundColor: p.color ?? '#6366f1' }}
                      >
                        {p.name[0]}
                      </AvatarFallback>
                    </Avatar>
                  ))}
                  {bill.bill_participants.length > 3 && (
                    <Avatar className="h-6 w-6 border-2 border-background">
                      <AvatarFallback className="text-[10px] bg-muted">
                        +{bill.bill_participants.length - 3}
                      </AvatarFallback>
                    </Avatar>
                  )}
                </div>
                <span className="text-sm font-semibold whitespace-nowrap">
                  {symbol} {total.toFixed(0)}
                </span>
              </div>
            </Link>
          )
        })}
      </CardContent>
    </Card>
  )
}
