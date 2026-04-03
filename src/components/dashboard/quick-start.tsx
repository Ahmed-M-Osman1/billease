'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { PlusCircle, Sparkles } from 'lucide-react'

export function QuickStart() {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center py-8 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
          <Sparkles className="h-8 w-8 text-primary" />
        </div>
        <h3 className="text-lg font-semibold mb-1">Split a New Bill</h3>
        <p className="text-sm text-muted-foreground mb-4 max-w-xs">
          Upload a photo of your bill and let AI extract the items automatically
        </p>
        <Link href="/bill/new">
          <Button size="lg" className="gap-2">
            <PlusCircle className="h-5 w-5" />
            New Bill
          </Button>
        </Link>
      </CardContent>
    </Card>
  )
}
