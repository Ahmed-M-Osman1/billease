'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function MobileFAB() {
  const pathname = usePathname()

  // Don't show FAB on the new bill page itself
  if (pathname === '/bill/new') return null

  return (
    <Link href="/bill/new" className="lg:hidden fixed bottom-6 right-6 z-30">
      <Button
        size="lg"
        className="h-14 w-14 rounded-full shadow-lg"
      >
        <Plus className="h-6 w-6" />
        <span className="sr-only">New Bill</span>
      </Button>
    </Link>
  )
}
