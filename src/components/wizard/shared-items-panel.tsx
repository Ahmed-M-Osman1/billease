'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { SubsetSheet } from './subset-sheet'
import type { SharedSpec, SessionPerson } from '@/party/bill-session'

interface Item {
  id: string
  name: string
  price: number
}

interface SharedItemsPanelProps {
  items: Item[]
  people: SessionPerson[]
  markings: Map<string, SharedSpec | undefined>
  onChange: (itemId: string, spec: SharedSpec | undefined) => void
}

type ItemMode = 'individual' | 'all' | 'subset'

function getMode(spec: SharedSpec | undefined): ItemMode {
  if (!spec) return 'individual'
  return spec.mode === 'all' ? 'all' : 'subset'
}

export function SharedItemsPanel({ items, people, markings, onChange }: SharedItemsPanelProps) {
  const [sheetItemId, setSheetItemId] = useState<string | null>(null)
  const sheetItem = sheetItemId ? items.find((i) => i.id === sheetItemId) : null
  const sheetSpec = sheetItemId ? markings.get(sheetItemId) : undefined

  const hasNoPeople = people.length === 0

  const handleModeClick = (item: Item, mode: ItemMode) => {
    if (mode === 'individual') {
      onChange(item.id, undefined)
    } else if (mode === 'all') {
      onChange(item.id, { mode: 'all', people: [] })
    } else {
      // subset — open sheet
      setSheetItemId(item.id)
    }
  }

  const handleSubsetConfirm = (slugs: string[]) => {
    if (!sheetItemId) return
    onChange(sheetItemId, { mode: 'subset', people: slugs })
    setSheetItemId(null)
  }

  const formatPrice = (price: number) =>
    price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  return (
    <>
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground">
          Mark items shared before starting — claimants can&apos;t change this.
        </p>
        {items.map((item) => {
          const spec = markings.get(item.id)
          const mode = getMode(spec)

          return (
            <div
              key={item.id}
              className="rounded-lg border bg-card px-4 py-3 space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium truncate mr-2">{item.name}</span>
                <span className="text-sm text-muted-foreground flex-shrink-0">
                  {formatPrice(item.price)}
                </span>
              </div>

              {/* Three-state toggle */}
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant={mode === 'individual' ? 'default' : 'outline'}
                  className="flex-1 h-7 text-xs"
                  onClick={() => handleModeClick(item, 'individual')}
                >
                  Individual
                </Button>
                <Button
                  size="sm"
                  variant={mode === 'all' ? 'default' : 'outline'}
                  className="flex-1 h-7 text-xs"
                  onClick={() => handleModeClick(item, 'all')}
                >
                  Shared — All
                </Button>
                <Button
                  size="sm"
                  variant={mode === 'subset' ? 'default' : 'outline'}
                  className="flex-1 h-7 text-xs"
                  onClick={() => handleModeClick(item, 'subset')}
                  disabled={hasNoPeople}
                  title={hasNoPeople ? 'Add names in Step 2 to enable subset sharing' : undefined}
                >
                  {mode === 'subset' && spec?.people && spec.people.length > 0
                    ? `${spec.people.length} people`
                    : 'Subset'}
                </Button>
              </div>

              {/* Subset label */}
              {mode === 'subset' && spec?.people && spec.people.length > 0 && (
                <button
                  className="text-xs text-primary underline"
                  onClick={() => setSheetItemId(item.id)}
                >
                  Edit: {spec.people.map((slug) => people.find((p) => p.slug === slug)?.name ?? slug).join(', ')}
                </button>
              )}
            </div>
          )
        })}
      </div>

      {sheetItem && (
        <SubsetSheet
          open={sheetItemId !== null}
          onOpenChange={(open) => { if (!open) setSheetItemId(null) }}
          itemName={sheetItem.name}
          people={people}
          selectedSlugs={sheetSpec?.mode === 'subset' ? sheetSpec.people : []}
          onConfirm={handleSubsetConfirm}
        />
      )}
    </>
  )
}
