"use client";
import { useBillContext } from '@/contexts/BillContext';
import type { BillItem, Person } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { GripVertical, User, Users, Zap, Trash2, Loader2 } from 'lucide-react';
import { suggestItemAssignment } from '@/ai/flows/suggest-item-assignment';
import { useToast } from '@/hooks/use-toast';
import React, { useState, type DragEvent } from 'react';

interface DraggableItemProps {
  item: BillItem;
}

function DraggableItem({ item }: DraggableItemProps) {
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
      <span className="text-sm text-foreground/80">${item.price.toFixed(2)}</span>
    </div>
  );
}

interface DropZoneProps {
  personId: string | null; // null for unassigned
  title: string;
  items: BillItem[];
  children?: React.ReactNode;
}

function DropZone({ personId, title, items, children }: DropZoneProps) {
  const { dispatch } = useBillContext();
  const [isOver, setIsOver] = useState(false);

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsOver(true);
  };

  const handleDragLeave = () => {
    setIsOver(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsOver(false);
    const itemId = e.dataTransfer.getData('itemId');
    if (itemId) {
      dispatch({ type: 'ASSIGN_ITEM', payload: { itemId, personId } });
    }
  };

  return (
    <Card 
      className={`flex-1 min-w-[250px] transition-all ${isOver ? 'bg-accent/30 ring-2 ring-primary' : 'bg-muted/20'}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      aria-label={`Drop zone for ${title}`}
    >
      <CardHeader className="pb-2 pt-4">
        <CardTitle className="text-lg flex items-center gap-2">
          {personId ? <User className="h-5 w-5 text-primary"/> : <Users className="h-5 w-5 text-primary"/> }
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-80 pr-2">
          {items.length === 0 && <p className="text-sm text-muted-foreground p-4 text-center">Drag items here</p>}
          {items.map(item => <DraggableItem key={item.id} item={item} />)}
        </ScrollArea>
        {children}
      </CardContent>
    </Card>
  );
}

export function ItemAssignmentArea() {
  const { state, dispatch } = useBillContext();
  const { toast } = useToast();

  const unassignedItems = state.items.filter(item => item.assignedTo === null);
  const hasUnassignedItems = unassignedItems.length > 0;
  const canSuggest = state.people.length > 0 && hasUnassignedItems;

  const handleSuggestAssignments = async () => {
    if (!canSuggest) {
      toast({ title: "Cannot suggest", description: "Ensure there are people and unassigned items.", variant: "default" });
      return;
    }
    dispatch({ type: 'START_SUGGESTION' });
    try {
      // For simplicity, order history is not implemented in this version.
      // The AI flow mentions optional orderHistory: Record<string, string>.
      // We pass an empty object or undefined.
      const itemNames = state.items.filter(i => i.assignedTo === null).map(i => i.name); // Only suggest for unassigned items.
      const peopleNames = state.people.map(p => p.name);

      if (itemNames.length === 0) {
        toast({ title: "No items to suggest", description: "All items are already assigned or there are no items." });
        dispatch({ type: 'SUGGESTION_FAILURE', payload: "No unassigned items for suggestion." });
        return;
      }

      const result = await suggestItemAssignment({
        items: itemNames,
        people: peopleNames,
        // orderHistory: {} // Example: Pass empty if not used
      });
      
      // The AI returns { itemName: personName }. We need to map this back.
      // This simplified mapping assumes item names are unique among unassigned items
      // and person names are unique.
      const assignmentsToDispatch: Record<string, string> = {};
      for (const [itemName, personName] of Object.entries(result)) {
         const itemToAssign = state.items.find(i => i.name === itemName && i.assignedTo === null);
         const personTarget = state.people.find(p => p.name === personName);
         if(itemToAssign && personTarget) {
            // We'll dispatch individual ASSIGN_ITEM actions for clarity,
            // or the reducer can be enhanced to take a map.
            // For now, let's build a map for the reducer to handle.
            assignmentsToDispatch[itemToAssign.name] = personTarget.name; 
         }
      }

      dispatch({ type: 'SUGGESTION_SUCCESS', payload: { assignments: assignmentsToDispatch } });
      toast({ title: "AI Suggestion Applied", description: "Items have been assigned based on AI suggestion." });

    } catch (error) {
      console.error("Suggestion Error:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error during suggestion";
      dispatch({ type: 'SUGGESTION_FAILURE', payload: `Suggestion failed: ${errorMessage}` });
      toast({ title: "AI Suggestion Failed", description: `Could not suggest assignments. ${errorMessage}`, variant: "destructive" });
    }
  };

  if (state.items.length === 0) {
     return (
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-6 w-6 text-primary" />
            Assign Items
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Add or extract bill items to start assigning them to people.</p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <div className="space-y-6">
      <Card className="shadow-lg border-primary/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <Zap className="h-7 w-7 text-primary" />
            Assign Items to People
          </CardTitle>
          <CardDescription>Drag items from 'Unassigned' to the respective person. Or, let AI help!</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 overflow-x-auto pb-4">
            <DropZone personId={null} title="Unassigned Items" items={unassignedItems} />
            {state.people.map(person => (
              <DropZone
                key={person.id}
                personId={person.id}
                title={person.name}
                items={state.items.filter(item => item.assignedTo === person.id)}
              />
            ))}
          </div>
          {state.people.length === 0 && <p className="text-center text-muted-foreground mt-4">Add people to start assigning items.</p>}
        </CardContent>
      </Card>
      <div className="flex flex-col sm:flex-row gap-2 justify-end">
          <Button onClick={() => dispatch({ type: 'RESET_ASSIGNMENTS' })} variant="outline" className="w-full sm:w-auto">
            <Trash2 className="mr-2 h-4 w-4" /> Reset All Assignments
          </Button>
          {canSuggest && (
            <Button onClick={handleSuggestAssignments} disabled={state.isLoadingSuggestion} className="w-full sm:w-auto bg-accent hover:bg-accent/90 text-accent-foreground">
              {state.isLoadingSuggestion ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Zap className="mr-2 h-4 w-4" />}
              Suggest Assignments (AI)
            </Button>
          )}
        </div>
        {state.error && state.error.includes("Suggestion") && <p className="text-sm text-destructive mt-2 text-right">{state.error}</p>}
    </div>
  );
}
