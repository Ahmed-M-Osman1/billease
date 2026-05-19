'use client'

import { useState } from 'react'
import { useBillStore } from '@/stores/bill-store'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import { PersonCard } from './person-card'
import { WizardNavigation } from './wizard-navigation'
import { Plus, Users } from 'lucide-react'

export function StepPeople() {
  const store = useBillStore()
  const manualPools = store.customSharedPools.filter((pool) => pool.kind !== 'auto')
  const [newName, setNewName] = useState('')
  const [groupName, setGroupName] = useState('')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)

  const handleAddPerson = () => {
    const name = newName.trim()
    if (!name) return
    store.addPerson(name)
    setNewName('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAddPerson()
    }
  }

  const handleCreateGroup = () => {
    if (!groupName.trim() || selectedIds.length < 2) return
    store.addCustomPool(groupName.trim(), selectedIds)
    setGroupName('')
    setSelectedIds([])
    setDialogOpen(false)
  }

  const toggleMember = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  const canProceed = store.people.length >= 2

  return (
    <div className="space-y-6">
      {/* Add people */}
      <div>
        <Label className="text-sm font-medium mb-2 block">Add people</Label>
        <div className="flex gap-2">
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enter name and press Enter"
            className="flex-1"
          />
          <Button onClick={handleAddPerson} disabled={!newName.trim()}>
            <Plus className="h-4 w-4 mr-1" />
            Add
          </Button>
        </div>
      </div>

      {/* People list */}
      {store.people.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">{store.people.length} people added</p>
          <ScrollArea className="max-h-48">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {store.people.map((person) => (
                <PersonCard
                  key={person.id}
                  id={person.id}
                  name={person.name}
                  color={person.color}
                  onNameChange={(name) => store.updatePersonName(person.id, name)}
                  onRemove={() => store.removePerson(person.id)}
                />
              ))}
            </div>
          </ScrollArea>
        </div>
      )}

      {/* Custom split groups */}
      {store.people.length >= 2 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Custom Split Groups</CardTitle>
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Users className="h-3.5 w-3.5 mr-1" />
                    New group
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create Split Group</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Group name</Label>
                      <Input
                        value={groupName}
                        onChange={(e) => setGroupName(e.target.value)}
                        placeholder="e.g. Couples table"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Members (select at least 2)</Label>
                      <div className="space-y-2">
                        {store.people.map((person) => (
                          <label
                            key={person.id}
                            className="flex items-center gap-2 cursor-pointer"
                          >
                            <Checkbox
                              checked={selectedIds.includes(person.id)}
                              onCheckedChange={() => toggleMember(person.id)}
                            />
                            <div
                              className="h-5 w-5 rounded-full flex items-center justify-center text-white text-[10px] font-bold"
                              style={{ backgroundColor: person.color }}
                            >
                              {person.name[0]}
                            </div>
                            <span className="text-sm">{person.name}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    <Button
                      onClick={handleCreateGroup}
                      disabled={!groupName.trim() || selectedIds.length < 2}
                      className="w-full"
                    >
                      Create Group
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          {manualPools.length > 0 && (
            <CardContent className="pt-0">
              <div className="space-y-2">
                {manualPools.map((pool) => (
                  <div
                    key={pool.id}
                    className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2"
                  >
                    <div>
                      <p className="text-sm font-medium">{pool.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {pool.personIds.length} members
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive h-7"
                      onClick={() => store.deleteCustomPool(pool.id)}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          )}
        </Card>
      )}

      {!canProceed && store.people.length > 0 && (
        <p className="text-sm text-amber-600">Add at least 2 people to continue</p>
      )}

      <div className="flex justify-center">
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground text-xs"
          onClick={() => store.setStep(2)}
        >
          Skip — everyone pays for what they ordered
        </Button>
      </div>

      <WizardNavigation
        canGoBack={true}
        canGoNext={canProceed}
        onBack={() => store.prevStep()}
        onNext={() => store.nextStep()}
      />
    </div>
  )
}
