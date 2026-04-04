'use client'

import { useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Download, FileText, Share, Copy } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import type { CalculatedPersonSummary } from '@/lib/types'
import { getCurrencySymbol } from '@/lib/constants'

interface ExportActionsProps {
  summaries: CalculatedPersonSummary[]
  currency: string
  billTitle: string
  captureRef: React.RefObject<HTMLDivElement | null>
}

export function ExportActions({ summaries, currency, billTitle, captureRef }: ExportActionsProps) {
  const { toast } = useToast()
  const sym = getCurrencySymbol(currency)

  const handlePNG = async () => {
    if (!captureRef.current) return
    try {
      const html2canvas = (await import('html2canvas')).default
      const canvas = await html2canvas(captureRef.current, { scale: 2 })
      const link = document.createElement('a')
      link.download = `${billTitle || 'bill'}-summary.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
      toast({ title: 'PNG downloaded' })
    } catch {
      toast({ variant: 'destructive', title: 'Export failed' })
    }
  }

  const handleCopyText = () => {
    const text = summaries
      .map((s) => `${s.name}: ${sym} ${s.totalDue.toFixed(2)}`)
      .join('\n')
    const full = `${billTitle || 'Bill'} Summary\n\n${text}`
    navigator.clipboard.writeText(full)
    toast({ title: 'Copied to clipboard' })
  }

  const handleWhatsApp = () => {
    const text = summaries
      .map((s) => `• ${s.name}: ${sym} ${s.totalDue.toFixed(2)}`)
      .join('\n')
    const full = `*${billTitle || 'Bill'} Summary*\n\n${text}`
    window.open(`https://wa.me/?text=${encodeURIComponent(full)}`, '_blank')
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" size="sm" onClick={handlePNG}>
        <Download className="h-3.5 w-3.5 mr-1" />
        PNG
      </Button>
      <Button variant="outline" size="sm" onClick={handleCopyText}>
        <Copy className="h-3.5 w-3.5 mr-1" />
        Copy
      </Button>
      <Button variant="outline" size="sm" onClick={handleWhatsApp}>
        <Share className="h-3.5 w-3.5 mr-1" />
        WhatsApp
      </Button>
    </div>
  )
}
