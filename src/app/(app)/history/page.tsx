'use client'

import { useEffect, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { getCurrencySymbol } from '@/lib/constants'
import { format } from 'date-fns'
import { Search, Receipt, Clock } from 'lucide-react'
import Link from 'next/link'

export default function HistoryPage() {
  const [bills, setBills] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/bills')
      .then((r) => r.json())
      .then((data) => setBills(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const filtered = bills.filter((b) =>
    b.title.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Bill History</h1>
        <p className="text-muted-foreground">View and manage your past bills</p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search bills..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Clock className="h-16 w-16 text-muted-foreground/30 mb-4" />
          <h3 className="font-semibold text-lg mb-1">No bills yet</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Your bill history will appear here after you split your first bill
          </p>
          <Link href="/bill/new">
            <button className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
              Split your first bill
            </button>
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((bill) => {
            const total = bill.subtotal + bill.vat + bill.serviceCharge + bill.delivery + bill.tip
            const sym = getCurrencySymbol(bill.currency)
            return (
              <Link key={bill.id} href={`/bill/${bill.id}`}>
                <Card className="transition-colors hover:bg-muted/30 cursor-pointer">
                  <CardContent className="flex items-center gap-4 p-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                      <Receipt className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{bill.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(bill.date), 'MMM d, yyyy')}
                      </p>
                    </div>
                    <div className="flex -space-x-1.5">
                      {bill.participants?.slice(0, 3).map((p: any) => (
                        <Avatar key={p.id} className="h-6 w-6 border-2 border-background">
                          <AvatarFallback className="text-[10px]" style={{ backgroundColor: p.color ?? '#6366f1' }}>
                            {p.name[0]}
                          </AvatarFallback>
                        </Avatar>
                      ))}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-semibold">{sym} {total.toFixed(0)}</p>
                      <Badge variant="secondary" className="text-[10px]">{bill.status}</Badge>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
