'use client'

import { useState } from 'react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import type { SessionPerson } from '@/party/bill-session'

interface SubsetSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  itemName: string
  people: SessionPerson[]
  selectedSlugs: string[]
  onConfirm: (slugs: string[]) => void
}

export function SubsetSheet({
  open,
  onOpenChange,
  itemName,
  people,
  selectedSlugs,
  onConfirm,
}: SubsetSheetProps) {
  const [selected, setSelected] = useState<string[]>(selectedSlugs)

  const toggle = (slug: string) => {
    setSelected((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]
    )
  }

  const handleConfirm = () => {
    onConfirm(selected)
    onOpenChange(false)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="pb-8">
        <SheetHeader>
          <SheetTitle className="text-base">Who shares &ldquo;{itemName}&rdquo;?</SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-3">
          {people.map((person) => (
            <label
              key={person.slug}
              className="flex items-center gap-3 cursor-pointer py-1"
            >
              <Checkbox
                checked={selected.includes(person.slug)}
                onCheckedChange={() => toggle(person.slug)}
              />
              <div
                className="h-6 w-6 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                style={{ backgroundColor: person.color }}
              >
                {person.name[0].toUpperCase()}
              </div>
              <span className="text-sm">{person.name}</span>
            </label>
          ))}
        </div>
        <Button
          className="w-full mt-6"
          onClick={handleConfirm}
          disabled={selected.length < 2}
        >
          Done {selected.length >= 2 ? `(${selected.length} people)` : '— select at least 2'}
        </Button>
      </SheetContent>
    </Sheet>
  )
}
