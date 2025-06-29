"use client";
import { useBillContext } from '@/contexts/BillContext';
import type { BillItem } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { GripVertical, User, Users, Zap, Trash2, Loader2, Archive, Box, Users2, ChevronsRight, LogOut } from 'lucide-react';
import { suggestItemAssignment } from '@/ai/flows/suggest-item-assignment';
import { useToast } from '@/hooks/use-toast';
import React, { useState, type DragEvent } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

// --- Desktop Draggable Item ---
function DraggableItem({ item }: { item: BillItem }) {
  const handleDragStart = (e: DragEvent<HTMLDivElement>) => {
    e.dataTransfer.setData('itemId', item.id);
    e.currentTarget.classList.add('opacity-50', 'ring-2', 'ring-primary');
  };

  const handleDragEnd = (e: DragEvent<HTMLDivElement>) => {
    e.currentTarget.classList.remove('opacity-50', 'ring-2', 'ring-primary');
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      className="p-3 mb-2 bg-card border rounded-md shadow-sm cursor-grab active:cursor-grabbing flex justify-between items-center hover:shadow-md transition-shadow"
      aria-label={`Item ${item.name}, price ${item.price.toFixed(2)}`}
    >
      <div className="flex items-center">
        <GripVertical className="h-5 w-5 text-muted-foreground mr-2" />
        <span className="font-medium">{item.name}</span>
      </div>
      <span className="text-sm text-foreground/80">{item.price.toFixed(2)} EGP</span>
    </div>
  );
}

// --- Mobile Clickable Item ---
function ClickableItem({ item, onClick }: { item: BillItem, onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full p-3 mb-2 bg-card border rounded-md shadow-sm flex justify-between items-center hover:bg-muted/50 transition-colors text-left"
      aria-label={`Assign item ${item.name}, price ${item.price.toFixed(2)}`}
    >
      <span className="font-medium">{item.name}</span>
      <div className="flex items-center gap-2">
        <span className="text-sm text-foreground/80">{item.price.toFixed(2)} EGP</span>
        <ChevronsRight className="h-4 w-4 text-muted-foreground" />
      </div>
    </button>
  );
}

export function ItemAssignmentArea() {
  const { state, dispatch } = useBillContext();
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<BillItem | null>(null);
  
  const itemsWithPrice = state.items.filter(item => item.price > 0);
  const unassignedItems = itemsWithPrice.filter(item => item.assignedTo === null);
  
  const handleSuggestAssignments = async () => {
    const hasUnassignedItemsForSuggestion = unassignedItems.length > 0;
    const canSuggest = state.people.length > 0 && hasUnassignedItemsForSuggestion;
    if (!canSuggest) {
      toast({ title: "Cannot suggest", description: "Ensure there are people and unassigned items.", variant: "default" });
      return;
    }
    dispatch({ type: 'START_SUGGESTION' });
    try {
      const result = await suggestItemAssignment({
        items: unassignedItems.map(i => i.name),
        people: state.people.map(p => p.name),
      });
      
      const assignmentsToDispatch: Record<string, string> = {};
      for (const [itemName, personName] of Object.entries(result)) {
        if (unassignedItems.find(i => i.name === itemName) && state.people.find(p => p.name === personName)) {
           assignmentsToDispatch[itemName] = personName; 
        }
      }
      
      if (Object.keys(assignmentsToDispatch).length > 0) {
        dispatch({ type: 'SUGGESTION_SUCCESS', payload: { assignments: assignmentsToDispatch } });
        toast({ title: "AI Suggestion Applied" });
      } else {
        toast({ title: "AI Suggestion", description: "AI could not make new assignments." });
        dispatch({ type: 'SUGGESTION_FAILURE', payload: "No new assignments from AI." });
      }
    } catch (error) {
       const errorMessage = error instanceof Error ? error.message : "Unknown error";
      dispatch({ type: 'SUGGESTION_FAILURE', payload: `Suggestion failed: ${errorMessage}` });
      toast({ title: "AI Suggestion Failed", description: errorMessage, variant: "destructive" });
    }
  };

  const handleOpenAssignDialog = (item: BillItem) => {
    setSelectedItem(item);
    setIsAssignDialogOpen(true);
  };
  
  const handleAssignItem = (targetId: string | null) => {
    if (selectedItem) {
      dispatch({ type: 'ASSIGN_ITEM', payload: { itemId: selectedItem.id, targetId } });
    }
    setIsAssignDialogOpen(false);
    setSelectedItem(null);
  };
  
  if (state.items.length === 0 && !state.isOcrCompleted) {
     return (
      <Card className="shadow-lg"><CardHeader><CardTitle className="flex items-center gap-2"><Zap className="h-6 w-6 text-primary" />Assign Items</CardTitle></CardHeader><CardContent><p className="text-muted-foreground">Add or extract bill items to start.</p></CardContent></Card>
    );
  }

  // --- Main Render ---
  return (
    <div className="space-y-6">
      <Card className="shadow-lg border-primary/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl"><Zap className="h-7 w-7 text-primary" />Assign Items</CardTitle>
          <CardDescription>
            {isMobile ? "Tap an item to assign it." : "Drag items to a person or group."} Items with a price of 0 are not shown.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isMobile ? 
            <MobileLayout items={itemsWithPrice} onAssignClick={handleOpenAssignDialog} /> : 
            <DesktopLayout items={itemsWithPrice} />
          }
        </CardContent>
      </Card>
      
      <div className="flex flex-col sm:flex-row gap-2 justify-end">
        <Button onClick={() => dispatch({ type: 'RESET_ASSIGNMENTS' })} variant="outline" className="w-full sm:w-auto">
          <Trash2 className="mr-2" /> Reset Assignments
        </Button>
        {unassignedItems.length > 0 && state.people.length > 0 && (
          <Button onClick={handleSuggestAssignments} disabled={state.isLoadingSuggestion} className="w-full sm:w-auto bg-accent hover:bg-accent/90 text-accent-foreground">
            {state.isLoadingSuggestion ? <Loader2 className="mr-2 animate-spin" /> : <Zap className="mr-2" />}
            Suggest Assignments (AI)
          </Button>
        )}
      </div>
      {state.error && state.error.includes("Suggestion") && <p className="text-sm text-destructive mt-2 text-right">{state.error}</p>}
      
      {/* --- Assignment Dialog for Mobile --- */}
      <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Item: <span className="text-primary">{selectedItem?.name}</span></DialogTitle>
            <DialogDescription>Select a person or group to assign this item to.</DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            <div className="p-1 space-y-2">
                <Button variant="outline" className="w-full justify-start" onClick={() => handleAssignItem(null)}><LogOut className="mr-2"/>Unassign</Button>
                <Separator/>
                <h4 className="font-semibold text-muted-foreground text-sm pt-2">Groups</h4>
                <Button variant="ghost" className="w-full justify-start" onClick={() => handleAssignItem('SHARED_ALL_PEOPLE')}><Archive className="mr-2"/>Shared (All People)</Button>
                {state.customSharedPools.map(pool => (
                  <Button key={pool.id} variant="ghost" className="w-full justify-start" onClick={() => handleAssignItem(pool.id)}><Users2 className="mr-2"/>{pool.name}</Button>
                ))}
                <Separator/>
                <h4 className="font-semibold text-muted-foreground text-sm pt-2">People</h4>
                {state.people.map(person => (
                  <Button key={person.id} variant="ghost" className="w-full justify-start" onClick={() => handleAssignItem(person.id)}><User className="mr-2"/>{person.name}</Button>
                ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// --- Desktop Layout Component ---
function DesktopLayout({ items }: { items: BillItem[] }) {
  const { state } = useBillContext();

  const unassignedItems = items.filter(item => item.assignedTo === null);
  const sharedAllPeopleItems = items.filter(item => item.assignedTo === 'SHARED_ALL_PEOPLE');

  const DropZone = ({ targetId, title, items: zoneItems, subtitle, icon }: { targetId: string | null; title: string; items: BillItem[]; subtitle?: string; icon?: React.ReactNode; }) => {
    const { dispatch } = useBillContext();
    const [isOver, setIsOver] = useState(false);
    
    const handleDragOver = (e: DragEvent<HTMLDivElement>) => { e.preventDefault(); setIsOver(true); };
    const handleDragLeave = () => setIsOver(false);
    const handleDrop = (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault(); setIsOver(false);
      const itemId = e.dataTransfer.getData('itemId');
      if (itemId) dispatch({ type: 'ASSIGN_ITEM', payload: { itemId, targetId } });
    };
    
    return (
      <Card className={`flex-1 transition-all ${isOver ? 'bg-accent/30 ring-2 ring-primary' : 'bg-muted/20'}`} onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}>
        <CardHeader className="pb-2 pt-4"><CardTitle className="text-lg flex items-center gap-2">{icon}{title}</CardTitle>{subtitle && <CardDescription className="text-xs -mt-1 ml-7">{subtitle}</CardDescription>}</CardHeader>
        <CardContent><ScrollArea className="h-48 md:h-60 pr-2">{zoneItems.length === 0 ? <p className="text-sm text-muted-foreground p-4 text-center">Drag items here</p> : zoneItems.map(item => <DraggableItem key={item.id} item={item} />)}</ScrollArea></CardContent>
      </Card>
    );
  };
  
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <DropZone targetId={null} title="Unassigned Items" items={unassignedItems} icon={<Box className="h-5 w-5 text-indigo-500"/>} />
        <DropZone targetId="SHARED_ALL_PEOPLE" title="Shared (All People)" subtitle="Split evenly among everyone" items={sharedAllPeopleItems} icon={<Archive className="h-5 w-5 text-teal-500"/>}/>
      </div>

      {state.customSharedPools.length > 0 && (<>
        <Separator/> <h3 className="text-lg font-medium flex items-center gap-2"><Users2 className="h-6 w-6 text-primary"/>Custom Shared Groups</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {state.customSharedPools.map(pool => (
            <DropZone key={pool.id} targetId={pool.id} title={pool.name} subtitle={`With: ${pool.personIds.map(pid => state.people.find(p=>p.id===pid)?.name).join(', ')}`} items={items.filter(item => item.assignedTo === pool.id)} icon={<Users2 className="h-5 w-5 text-purple-500"/>} />
          ))}
        </div>
      </>)}
      
      {state.people.length > 0 && (<>
        <Separator/> <h3 className="text-lg font-medium flex items-center gap-2"><Users className="h-6 w-6 text-primary"/>Individuals</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {state.people.map(person => (
            <DropZone key={person.id} targetId={person.id} title={person.name} items={items.filter(item => item.assignedTo === person.id)} icon={<User className="h-5 w-5 text-blue-500"/>} />
          ))}
        </div>
      </>)}
    </div>
  );
}

// --- Mobile Layout Component ---
function MobileLayout({ items, onAssignClick }: { items: BillItem[], onAssignClick: (item: BillItem) => void }) {
    const { state } = useBillContext();

    const getAssignedToName = (assignedTo: string | null) => {
        if (assignedTo === null) return <span className="text-muted-foreground">Unassigned</span>;
        if (assignedTo === 'SHARED_ALL_PEOPLE') return <span className="flex items-center gap-1"><Archive className="h-3 w-3"/>All People</span>;
        const person = state.people.find(p => p.id === assignedTo);
        if (person) return <span className="flex items-center gap-1"><User className="h-3 w-3"/>{person.name}</span>;
        const pool = state.customSharedPools.find(p => p.id === assignedTo);
        if (pool) return <span className="flex items-center gap-1"><Users2 className="h-3 w-3"/>{pool.name}</span>;
        return <span className="text-muted-foreground">Unassigned</span>;
    };
    
    return (
        <div className="space-y-4">
            <h3 className="text-lg font-medium text-center">All Items</h3>
            <ScrollArea className="h-[60vh] pr-2">
                {items.length > 0 ? items.map(item => (
                    <div key={item.id} className="mb-2">
                       <ClickableItem item={item} onClick={() => onAssignClick(item)} />
                       <div className="text-xs text-right pr-2">Assigned to: {getAssignedToName(item.assignedTo)}</div>
                    </div>
                )) : (
                     <p className="text-muted-foreground text-center py-8">No items with a price greater than 0 to assign.</p>
                )}
            </ScrollArea>
        </div>
    );
}
