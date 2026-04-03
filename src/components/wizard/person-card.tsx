'use client'

import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'

interface PersonCardProps {
  id: string
  name: string
  color: string
  onNameChange: (name: string) => void
  onRemove: () => void
}

export function PersonCard({ id, name, color, onNameChange, onRemove }: PersonCardProps) {
  return (
    <div className="flex items-center gap-2 rounded-lg border p-2">
      <div
        className="h-8 w-8 shrink-0 rounded-full flex items-center justify-center text-white text-xs font-bold"
        style={{ backgroundColor: color }}
      >
        {name?.[0]?.toUpperCase() ?? '?'}
      </div>
      <Input
        value={name}
        onChange={(e) => onNameChange(e.target.value)}
        placeholder="Name"
        className="h-8 border-0 shadow-none focus-visible:ring-0 p-0"
      />
      <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={onRemove}>
        <X className="h-3 w-3" />
      </Button>
    </div>
  )
}
