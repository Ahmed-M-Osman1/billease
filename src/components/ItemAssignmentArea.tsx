
"use client";
import { useBillContext } from '@/contexts/BillContext';
import type { BillItem, Person, CustomSharedPool } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { GripVertical, User, Users, Zap, Trash2, Loader2, Archive, Box, Users2 } from 'lucide-react';
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
  targetId: string | null; // personId, customPoolId, 'SHARED_ALL_PEOPLE', or null for Unassigned
  title: string;
  items: BillItem[];
  subtitle?: string;
  children?: React.ReactNode;
  icon?: React.ReactNode;
}

function DropZone({ targetId, title, items, subtitle, children, icon }: DropZoneProps) {
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
      dispatch({ type: 'ASSIGN_ITEM', payload: { itemId, targetId } });
    }
  };
  
  let defaultIcon = <Box className="h-5 w-5 text-primary"/>; // Unassigned
  if (targetId === 'SHARED_ALL_PEOPLE') {
    defaultIcon = <Archive className="h-5 w-5 text-primary"/>;
  } else if (targetId && targetId !== null && targetId !== 'SHARED_ALL_PEOPLE' && !title.startsWith("Shared Group: ")) { // Assuming individual person if not 'SHARED_ALL_PEOPLE' and not explicitly a custom group title
     defaultIcon = <User className="h-5 w-5 text-primary"/>;
  } else if (title.startsWith("Shared Group: ")) { // Custom Shared Pool
     defaultIcon = <Users2 className="h-5 w-5 text-primary"/>;
  }


  return (
    <Card 
      className={`flex-1 transition-all ${isOver ? 'bg-accent/30 ring-2 ring-primary' : 'bg-muted/20'}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      aria-label={`Drop zone for ${title}`}
    >
      <CardHeader className="pb-2 pt-4">
        <CardTitle className="text-lg flex items-center gap-2">
          {icon || defaultIcon}
          {title}
        </CardTitle>
        {subtitle && <CardDescription className="text-xs -mt-1 ml-7">{subtitle}</CardDescription>}
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-48 md:h-60 pr-2"> 
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

  const itemsWithPrice = state.items.filter(item => item.price > 0);

  const unassignedItems = itemsWithPrice.filter(item => item.assignedTo === null);
  const sharedAllPeopleItems = itemsWithPrice.filter(item => item.assignedTo === 'SHARED_ALL_PEOPLE');
  
  const hasUnassignedItemsForSuggestion = unassignedItems.length > 0;
  const canSuggest = state.people.length > 0 && hasUnassignedItemsForSuggestion;

  const handleSuggestAssignments = async () => {
    if (!canSuggest) {
      toast({ title: "Cannot suggest", description: "Ensure there are people and unassigned items with a price greater than 0.", variant: "default" });
      return;
    }
    dispatch({ type: 'START_SUGGESTION' });
    try {
      const itemNamesToSuggest = unassignedItems.map(i => i.name); 
      const peopleNames = state.people.map(p => p.name);

      if (itemNamesToSuggest.length === 0) {
        toast({ title: "No items to suggest", description: "All items are already assigned or there are no items." });
        dispatch({ type: 'SUGGESTION_FAILURE', payload: "No unassigned items for suggestion." });
        return;
      }

      const result = await suggestItemAssignment({
        items: itemNamesToSuggest,
        people: peopleNames,
      });
      
      const assignmentsToDispatch: Record<string, string> = {};
      for (const [itemNameFromAI, personNameFromAI] of Object.entries(result)) {
        const itemToAssign = unassignedItems.find(i => i.name === itemNameFromAI);
        const personTarget = state.people.find(p => p.name === personNameFromAI);

        if(itemToAssign && personTarget) {
           assignmentsToDispatch[itemToAssign.name] = personTarget.name; 
        }
      }
      
      if (Object.keys(assignmentsToDispatch).length > 0) {
        dispatch({ type: 'SUGGESTION_SUCCESS', payload: { assignments: assignmentsToDispatch } });
        toast({ title: "AI Suggestion Applied", description: "Items have been assigned based on AI suggestion." });
      } else {
        toast({ title: "AI Suggestion", description: "AI could not make new assignments for unassigned items." });
        dispatch({ type: 'SUGGESTION_FAILURE', payload: "No new assignments suggested by AI." });
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error during suggestion";
      dispatch({ type: 'SUGGESTION_FAILURE', payload: `Suggestion failed: ${errorMessage}` });
      toast({ title: "AI Suggestion Failed", description: `Could not suggest assignments. ${errorMessage}`, variant: "destructive" });
    }
  };

  if (state.items.length === 0 && !state.isOcrCompleted) {
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
            Assign Items to People & Groups
          </CardTitle>
          <CardDescription>Drag items to 'Unassigned', 'Shared (All People)', a custom group, or an individual. Items with a price of 0 are not shown.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Top Section: Unassigned and Shared Items */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <DropZone 
              targetId={null} 
              title="Unassigned Items" 
              items={unassignedItems} 
              icon={<Box className="h-5 w-5 text-indigo-500 dark:text-indigo-400"/>} 
            />
            <DropZone 
              targetId="SHARED_ALL_PEOPLE" 
              title="Shared (All People)" 
              subtitle="Split evenly among everyone"
              items={sharedAllPeopleItems} 
              icon={<Archive className="h-5 w-5 text-teal-500 dark:text-teal-400"/>}
            />
          </div>

          {/* Custom Shared Pools Section */}
          {state.customSharedPools.length > 0 && (
            <>
              <Separator className="my-4" />
              <div>
                <h3 className="text-lg font-medium mb-3 flex items-center gap-2">
                  <Users2 className="h-6 w-6 text-primary" />
                  Assign to Custom Shared Groups
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pb-4">
                  {state.customSharedPools.map(pool => {
                    const poolMemberNames = pool.personIds.map(pid => state.people.find(p => p.id === pid)?.name || 'Unknown').join(', ');
                    return (
                      <DropZone
                        key={pool.id}
                        targetId={pool.id}
                        title={`Shared Group: ${pool.name}`}
                        subtitle={`With: ${poolMemberNames || 'No members'}`}
                        items={itemsWithPrice.filter(item => item.assignedTo === pool.id)}
                        icon={<Users2 className="h-5 w-5 text-purple-500 dark:text-purple-400"/>}
                      />
                    );
                  })}
                </div>
              </div>
            </>
          )}


          {/* People Section */}
          {state.people.length > 0 && (
            <>
              <Separator className="my-4" />
              <div>
                <h3 className="text-lg font-medium mb-3 flex items-center gap-2">
                  <Users className="h-6 w-6 text-primary" />
                  Assign to Individuals
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-4">
                  {state.people.map(person => (
                    <DropZone
                      key={person.id}
                      targetId={person.id}
                      title={person.name}
                      items={itemsWithPrice.filter(item => item.assignedTo === person.id)}
                      icon={<User className="h-5 w-5 text-blue-500 dark:text-blue-400"/>}
                    />
                  ))}
                </div>
              </div>
            </>
          )}
          {state.people.length === 0 && itemsWithPrice.length > 0 && (
             <p className="text-center text-muted-foreground mt-4">Add people to start assigning items to individuals.</p>
          )}
          {itemsWithPrice.length === 0 && state.isOcrCompleted && (
            <p className="text-center text-muted-foreground mt-4">No items with a price greater than 0 to assign. Add items or check extracted bill.</p>
          )}

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
