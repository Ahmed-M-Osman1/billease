'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { getCurrencySymbol } from '@/lib/constants'
import { format } from 'date-fns'
import { ArrowLeft, Receipt } from 'lucide-react'
import Link from 'next/link'

export default function BillDetailPage() {
  const params = useParams()
  const [bill, setBill] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/bills/${params.id}`)
      .then((r) => r.json())
      .then(setBill)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [params.id])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  if (!bill || bill.error) {
    return (
      <div className="text-center py-20">
        <Receipt className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
        <p className="text-muted-foreground">Bill not found</p>
        <Link href="/history">
          <Button variant="outline" className="mt-4">Back to History</Button>
        </Link>
      </div>
    )
  }

  const sym = getCurrencySymbol(bill.currency)
  const total = bill.subtotal + bill.vat + bill.serviceCharge + bill.delivery + bill.tip

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/history">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{bill.title}</h1>
          <p className="text-sm text-muted-foreground">{format(new Date(bill.date), 'MMMM d, yyyy')}</p>
        </div>
        <Badge>{bill.status}</Badge>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">Bill Summary</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between"><span>Subtotal</span><span>{sym} {bill.subtotal.toFixed(2)}</span></div>
          <div className="flex justify-between"><span>VAT</span><span>{sym} {bill.vat.toFixed(2)}</span></div>
          <div className="flex justify-between"><span>Service</span><span>{sym} {bill.serviceCharge.toFixed(2)}</span></div>
          {bill.delivery > 0 && <div className="flex justify-between"><span>Delivery</span><span>{sym} {bill.delivery.toFixed(2)}</span></div>}
          {bill.tip > 0 && <div className="flex justify-between"><span>Tip</span><span>{sym} {bill.tip.toFixed(2)}</span></div>}
          <Separator />
          <div className="flex justify-between font-bold text-base">
            <span>Total</span><span className="text-primary">{sym} {total.toFixed(2)}</span>
          </div>
        </CardContent>
      </Card>

      {bill.participants?.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Participants</CardTitle></CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {bill.participants.map((p: any) => (
                <div key={p.id} className="flex items-center gap-2 rounded-full bg-muted px-3 py-1">
                  <div className="h-5 w-5 rounded-full" style={{ backgroundColor: p.color ?? '#6366f1' }} />
                  <span className="text-sm">{p.name}</span>
                  {p.isSettled && <Badge variant="secondary" className="text-[10px] h-4">Paid</Badge>}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {bill.items?.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Items ({bill.items.length})</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {bill.items.map((item: any) => (
                <div key={item.id} className="flex justify-between text-sm">
                  <span>{item.name}</span>
                  <span className="font-medium">{sym} {item.price.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
