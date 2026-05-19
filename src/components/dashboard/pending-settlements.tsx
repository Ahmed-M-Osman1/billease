'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowRightLeft } from 'lucide-react'

export function PendingSettlements() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Pending Settlements</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center justify-center py-6 text-center">
          <ArrowRightLeft className="h-10 w-10 text-muted-foreground/50 mb-3" />
          <p className="text-sm text-muted-foreground">No pending settlements</p>
        </div>
      </CardContent>
    </Card>
  )
}
