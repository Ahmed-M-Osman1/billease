'use client'

import { useEffect, useState } from 'react'
import { useAuthStore } from '@/stores/auth-store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getCurrencySymbol } from '@/lib/constants'
import { BarChart3, TrendingUp, PieChart } from 'lucide-react'
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'

export default function AnalyticsPage() {
  const { profile } = useAuthStore()
  const [bills, setBills] = useState<any[]>([])
  const sym = getCurrencySymbol(profile?.currency ?? 'EGP')

  useEffect(() => {
    fetch('/api/bills')
      .then((r) => r.json())
      .then((data) => setBills(Array.isArray(data) ? data : []))
      .catch(() => {})
  }, [])

  const spendingData = bills.reduce((acc: any[], bill) => {
    const month = new Date(bill.date).toISOString().slice(0, 7)
    const total = bill.subtotal + bill.vat + bill.serviceCharge + bill.delivery + bill.tip
    const existing = acc.find((d) => d.month === month)
    if (existing) { existing.amount += total } else { acc.push({ month, amount: total }) }
    return acc
  }, [])

  const restaurantData = bills.reduce((acc: any, bill) => {
    const total = bill.subtotal + bill.vat + bill.serviceCharge + bill.delivery + bill.tip
    acc[bill.title] = (acc[bill.title] || 0) + total
    return acc
  }, {} as Record<string, number>)

  const topRestaurants = Object.entries(restaurantData)
    .map(([name, amount]) => ({ name, amount }))
    .sort((a, b) => (b.amount as number) - (a.amount as number))
    .slice(0, 5)

  const totalSpent = bills.reduce(
    (sum, b) => sum + b.subtotal + b.vat + b.serviceCharge + b.delivery + b.tip, 0
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Analytics</h1>
        <p className="text-muted-foreground">Track your spending and splitting patterns</p>
      </div>

      {bills.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <BarChart3 className="h-16 w-16 text-muted-foreground/30 mb-4" />
          <h3 className="font-semibold text-lg mb-1">No data yet</h3>
          <p className="text-sm text-muted-foreground">Analytics will appear after you split some bills</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total Bills</p><p className="text-2xl font-bold">{bills.length}</p></CardContent></Card>
            <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total Spent</p><p className="text-2xl font-bold">{sym} {totalSpent.toFixed(0)}</p></CardContent></Card>
            <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Average Bill</p><p className="text-2xl font-bold">{sym} {(totalSpent / bills.length).toFixed(0)}</p></CardContent></Card>
          </div>

          <Card>
            <CardHeader><CardTitle className="text-sm flex items-center gap-2"><TrendingUp className="h-4 w-4" />Spending Over Time</CardTitle></CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={spendingData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="month" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip formatter={(v: number) => [`${sym} ${v.toFixed(0)}`, 'Amount']} />
                    <Line type="monotone" dataKey="amount" stroke="#3b82f6" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm flex items-center gap-2"><PieChart className="h-4 w-4" />Top Restaurants</CardTitle></CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topRestaurants} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis type="number" className="text-xs" />
                    <YAxis type="category" dataKey="name" width={120} className="text-xs" />
                    <Tooltip formatter={(v: number) => [`${sym} ${v.toFixed(0)}`, 'Amount']} />
                    <Bar dataKey="amount" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
