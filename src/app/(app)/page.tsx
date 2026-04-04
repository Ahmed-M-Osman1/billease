'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useAuthStore } from '@/stores/auth-store'
import { StatsRow } from '@/components/dashboard/stats-row'
import { RecentBills } from '@/components/dashboard/recent-bills'
import { QuickStart } from '@/components/dashboard/quick-start'
import { PendingSettlements } from '@/components/dashboard/pending-settlements'

export default function DashboardPage() {
  const { data: session } = useSession()
  const { profile } = useAuthStore()
  const [bills, setBills] = useState<any[]>([])
  const [stats, setStats] = useState({ count: 0, totalSpent: 0, avgBill: 0 })

  useEffect(() => {
    fetch('/api/dashboard')
      .then((r) => r.json())
      .then((data) => {
        setBills(data.recentBills ?? [])
        setStats(data.stats ?? { count: 0, totalSpent: 0, avgBill: 0 })
      })
      .catch(() => {})
  }, [])

  const greeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 18) return 'Good afternoon'
    return 'Good evening'
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">
          {greeting()}, {session?.user?.name?.split(' ')[0] ?? 'there'}
        </h1>
        <p className="text-muted-foreground">
          Here's an overview of your bill splitting activity
        </p>
      </div>

      <StatsRow
        billCount={stats.count}
        totalSpent={stats.totalSpent}
        avgBill={stats.avgBill}
        currency={profile?.currency ?? 'EGP'}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <RecentBills bills={bills} />
        <div className="space-y-6">
          <QuickStart />
          <PendingSettlements />
        </div>
      </div>
    </div>
  )
}
