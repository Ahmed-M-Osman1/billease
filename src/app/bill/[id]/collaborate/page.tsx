'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { getCurrencySymbol } from '@/lib/constants'
import { Receipt, Users, Check } from 'lucide-react'

export default function CollaboratePage() {
  const params = useParams()
  const [bill, setBill] = useState<any>(null)
  const [guestName, setGuestName] = useState('')
  const [joined, setJoined] = useState(false)
  const [myName, setMyName] = useState('')
  const [loading, setLoading] = useState(true)

  const billId = params.id as string

  const loadBill = () => {
    fetch(`/api/bills/${billId}`)
      .then((r) => r.json())
      .then((data) => {
        if (!data.error) setBill(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }

  useEffect(() => {
    loadBill()
    // Poll for updates every 3 seconds
    const interval = setInterval(loadBill, 3000)
    return () => clearInterval(interval)
  }, [billId])

  const handleJoin = () => {
    if (!guestName.trim()) return
    setMyName(guestName.trim())
    setJoined(true)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  if (!bill) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Receipt className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
          <p className="text-muted-foreground">Bill not found</p>
        </div>
      </div>
    )
  }

  const sym = getCurrencySymbol(bill.currency)
  const items = bill.items ?? []
  const participants = bill.participants ?? []

  if (!joined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Receipt className="h-6 w-6" />
            </div>
            <CardTitle>{bill.title}</CardTitle>
            <p className="text-sm text-muted-foreground">
              You've been invited to view this bill
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="h-4 w-4" />
              <span>{participants.length} participants</span>
              <span>·</span>
              <span>{items.length} items</span>
            </div>
            <Input
              placeholder="Enter your name"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
            />
            <Button className="w-full" onClick={handleJoin} disabled={!guestName.trim()}>
              View Bill
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const total = bill.subtotal + bill.vat + bill.serviceCharge + bill.delivery + bill.tip

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-xl font-bold">{bill.title}</h1>
          <p className="text-sm text-muted-foreground">Viewing as {myName}</p>
        </div>

        {participants.length > 0 && (
          <div className="flex flex-wrap gap-2 justify-center">
            {participants.map((p: any) => (
              <Badge key={p.id} variant="secondary">{p.name}</Badge>
            ))}
          </div>
        )}

        <Separator />

        <div className="space-y-2">
          {items.map((item: any) => {
            const claimedBy = participants.find((p: any) => p.id === item.assignedToId)
            return (
              <Card key={item.id}>
                <CardContent className="flex items-center gap-3 p-3">
                  <div className="flex-1">
                    <p className="text-sm font-medium">{item.name}</p>
                    {claimedBy && (
                      <p className="text-xs text-muted-foreground">{claimedBy.name}</p>
                    )}
                  </div>
                  <span className="text-sm font-semibold">{sym} {item.price.toFixed(2)}</span>
                  {claimedBy && <Check className="h-4 w-4 text-primary" />}
                </CardContent>
              </Card>
            )
          })}
        </div>

        <Card className="bg-muted/30">
          <CardContent className="p-4">
            <div className="flex justify-between font-bold">
              <span>Total</span>
              <span className="text-primary">{sym} {total.toFixed(2)}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
