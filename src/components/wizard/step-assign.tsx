'use client'

import { useBillStore } from '@/stores/bill-store'
import { suggestItemAssignment } from '@/ai/flows/suggest-item-assignment'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { useIsMobile } from '@/hooks/use-mobile'
import { SHARED_ALL_PEOPLE } from '@/lib/constants'
import { WizardNavigation } from './wizard-navigation'
import { Sparkles, Loader2, RotateCcw, Users, User, Share2, CheckCircle2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

export function StepAssign() {
  const store = useBillStore()
  const { toast } = useToast()
  const isMobile = useIsMobile()
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null)
  const [selectedAssigneeIds, setSelectedAssigneeIds] = useState<string[]>([])

  const unassignedItems = store.items.filter((item) => !item.assignedTo)
  const selectedItem = useMemo(
    () => store.items.find((item) => item.id === selectedItemId) ?? null,
    [selectedItemId, store.items]
  )

  const handleAISuggest = async () => {
    store.startSuggestion()
    try {
      const result = await suggestItemAssignment({
        itemNames: store.items.filter((i) => !i.assignedTo).map((i) => i.name),
        peopleNames: store.people.map((p) => p.name),
      })
      store.suggestionSuccess(result.assignments)
      toast({ title: 'AI suggestions applied' })
    } catch (err: any) {
      store.suggestionFailure(err.message)
      toast({ variant: 'destructive', title: 'Suggestion failed', description: err.message })
    }
  }

  const handleAssign = (itemId: string, targetId: string | null) => {
    store.assignItem(itemId, targetId)
    setSelectedItemId(null)
  }

  const getSelectedPersonIds = (assignedTo: string | null) => {
    if (!assignedTo) return []
    if (assignedTo === SHARED_ALL_PEOPLE) return store.people.map((person) => person.id)
    const pool = store.customSharedPools.find((item) => item.id === assignedTo)
    if (pool) return pool.personIds
    return [assignedTo]
  }

  useEffect(() => {
    if (!selectedItem) {
      setSelectedAssigneeIds([])
      return
    }

    setSelectedAssigneeIds(getSelectedPersonIds(selectedItem.assignedTo))
  }, [selectedItemId, selectedItem])

  const toggleAssignee = (personId: string) => {
    setSelectedAssigneeIds((current) =>
      current.includes(personId)
        ? current.filter((id) => id !== personId)
        : [...current, personId]
    )
  }

  const handleApplyMultiAssign = () => {
    if (!selectedItemId) return
    store.assignItemToPeople(selectedItemId, selectedAssigneeIds)
    setSelectedItemId(null)
  }

  const getAssigneeName = (assignedTo: string | null) => {
    if (!assignedTo) return null
    if (assignedTo === SHARED_ALL_PEOPLE) return 'Shared (All)'
    const person = store.people.find((p) => p.id === assignedTo)
    if (person) return person.name
    const pool = store.customSharedPools.find((p) => p.id === assignedTo)
    if (pool) return `${pool.personIds.length} people`
    return null
  }

  const getAssigneeColor = (assignedTo: string | null) => {
    if (!assignedTo) return undefined
    const person = store.people.find((p) => p.id === assignedTo)
    return (person as any)?.color
  }

  const canProceed = store.items.length > 0

  return (
    <div className="space-y-4">
      {/* Action bar */}
      <div className="flex items-center gap-2 flex-wrap">
        <Button
          variant="outline"
          size="sm"
          onClick={handleAISuggest}
          disabled={store.isLoadingSuggestion || unassignedItems.length === 0}
        >
          {store.isLoadingSuggestion ? (
            <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
          ) : (
            <Sparkles className="h-3.5 w-3.5 mr-1" />
          )}
          AI Auto-Assign
        </Button>
        <Button variant="ghost" size="sm" onClick={store.resetAssignments}>
          <RotateCcw className="h-3.5 w-3.5 mr-1" />
          Reset
        </Button>
        {unassignedItems.length > 0 && (
          <Badge variant="secondary" className="ml-auto">
            {unassignedItems.length} unassigned
          </Badge>
        )}
      </div>

      {/* Items list */}
      <ScrollArea className="max-h-[50vh]">
        <div className="space-y-2">
          {store.items.map((item) => {
            const assigneeName = getAssigneeName(item.assignedTo)
            const assigneeColor = getAssigneeColor(item.assignedTo)
            return (
              <div
                key={item.id}
                onClick={() => setSelectedItemId(item.id)}
                className="flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-colors hover:bg-muted/50"
              >
                {assigneeColor ? (
                  <div
                    className="h-7 w-7 shrink-0 rounded-full flex items-center justify-center text-white text-xs font-bold"
                    style={{ backgroundColor: assigneeColor }}
                  >
                    {assigneeName?.[0]}
                  </div>
                ) : item.assignedTo === SHARED_ALL_PEOPLE ? (
                  <div className="h-7 w-7 shrink-0 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                    <Share2 className="h-3.5 w-3.5 text-blue-600" />
                  </div>
                ) : item.assignedTo && store.customSharedPools.find((p) => p.id === item.assignedTo) ? (
                  <div className="h-7 w-7 shrink-0 rounded-full bg-violet-100 dark:bg-violet-900 flex items-center justify-center">
                    <Users className="h-3.5 w-3.5 text-violet-600" />
                  </div>
                ) : (
                  <div className="h-7 w-7 shrink-0 rounded-full bg-muted flex items-center justify-center">
                    <User className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{item.name || 'Unnamed item'}</p>
                  {assigneeName && (
                    <p className="text-xs text-muted-foreground">
                      {assigneeName}
                      {item.assignedTo && store.customSharedPools.find((pool) => pool.id === item.assignedTo) && (
                        <> · tap to edit members</>
                      )}
                    </p>
                  )}
                </div>
                <span className="text-sm font-semibold tabular-nums">
                  {store.currency} {item.price.toFixed(2)}
                </span>
              </div>
            )
          })}
        </div>
      </ScrollArea>

      {/* Assignment dialog */}
      <Dialog open={!!selectedItemId} onOpenChange={(open) => !open && setSelectedItemId(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              Assign: {selectedItem?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Button
              variant="outline"
              className="w-full justify-start gap-2"
              onClick={() => handleAssign(selectedItemId!, null)}
            >
              <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center">
                <User className="h-3 w-3" />
              </div>
              Unassign
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start gap-2"
              onClick={() => handleAssign(selectedItemId!, SHARED_ALL_PEOPLE)}
            >
              <div className="h-6 w-6 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                <Share2 className="h-3 w-3 text-blue-600" />
              </div>
              Shared (All People)
            </Button>
            <div className="rounded-xl border p-3">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <Label className="text-sm font-medium">Split between specific people</Label>
                  <p className="text-xs text-muted-foreground">
                    Pick one person or several. We&apos;ll split the item evenly between them.
                  </p>
                </div>
                <Badge variant="secondary">
                  {selectedAssigneeIds.length} selected
                </Badge>
              </div>

              <div className="space-y-2">
                {store.people.map((person) => (
                  <label
                    key={person.id}
                    className="flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 transition-colors hover:bg-muted/40"
                  >
                    <Checkbox
                      checked={selectedAssigneeIds.includes(person.id)}
                      onCheckedChange={() => toggleAssignee(person.id)}
                    />
                    <div
                      className="flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold text-white"
                      style={{ backgroundColor: person.color }}
                    >
                      {person.name[0]}
                    </div>
                    <span className="flex-1 text-sm">{person.name}</span>
                    {selectedAssigneeIds.includes(person.id) && (
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                    )}
                  </label>
                ))}
              </div>

              <div className="mt-3 flex gap-2">
                <Button
                  className="flex-1"
                  onClick={handleApplyMultiAssign}
                  disabled={selectedAssigneeIds.length === 0}
                >
                  Apply Selection
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setSelectedAssigneeIds([])}
                  disabled={selectedAssigneeIds.length === 0}
                >
                  Clear
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <WizardNavigation
        canGoBack={true}
        canGoNext={canProceed}
        onBack={() => store.prevStep()}
        onNext={() => {
          if (unassignedItems.length > 0) {
            toast({
              title: `${unassignedItems.length} items unassigned`,
              description: 'You can continue, but unassigned items won\'t appear in the summary.',
            })
          }
          store.nextStep()
        }}
      />
    </div>
  )
}
