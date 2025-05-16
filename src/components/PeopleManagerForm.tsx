
"use client";
import React, { useState } from 'react';
import { useBillContext } from '@/contexts/BillContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Save, PlusCircle, Trash2, Edit, CheckSquare, Square } from 'lucide-react';
import type { ChangeEvent } from 'react';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog"
import { ScrollArea } from '@/components/ui/scroll-area';
import type { CustomSharedPool } from '@/lib/types';

export function PeopleManagerForm() {
  const { state, dispatch } = useBillContext();
  const { toast } = useToast();
  const [isPoolDialogOpen, setIsPoolDialogOpen] = useState(false);
  const [currentPool, setCurrentPool] = useState<Partial<CustomSharedPool> & { personIds: string[] }>({ name: '', personIds: [] });
  const [editingPoolId, setEditingPoolId] = useState<string | null>(null);


  const handlePeopleCountChange = (e: ChangeEvent<HTMLInputElement>) => {
    const count = parseInt(e.target.value, 10);
    if (count >= 0 && count <= 20) { // Limit to 20 people
      dispatch({ type: 'SET_PEOPLE_COUNT', payload: count });
    }
  };

  const handleNameChange = (id: string, name: string) => {
    dispatch({ type: 'UPDATE_PERSON_NAME', payload: { id, name } });
  };

  const handleSavePeople = () => {
    try {
      localStorage.setItem('billEasePeople', JSON.stringify(state.people));
      toast({
        title: "People Saved",
        description: "The current list of people has been saved to your browser.",
      });
    } catch (error) {
      toast({
        title: "Error Saving People",
        description: "Could not save people to local storage.",
        variant: "destructive",
      });
    }
  };

  const handleOpenPoolDialog = (poolToEdit?: CustomSharedPool) => {
    if (poolToEdit) {
      setCurrentPool({ id: poolToEdit.id, name: poolToEdit.name, personIds: [...poolToEdit.personIds] });
      setEditingPoolId(poolToEdit.id);
    } else {
      setCurrentPool({ name: '', personIds: [] });
      setEditingPoolId(null);
    }
    setIsPoolDialogOpen(true);
  };

  const handlePoolNameChange = (name: string) => {
    setCurrentPool(prev => ({ ...prev, name }));
  };

  const handleTogglePersonInPool = (personId: string) => {
    setCurrentPool(prev => {
      const newPersonIds = prev.personIds.includes(personId)
        ? prev.personIds.filter(id => id !== personId)
        : [...prev.personIds, personId];
      return { ...prev, personIds: newPersonIds };
    });
  };

  const handleSaveCustomPool = () => {
    if (!currentPool.name?.trim()) {
      toast({ title: "Pool name required", description: "Please enter a name for the shared group.", variant: "destructive" });
      return;
    }
    if (currentPool.personIds.length < 2) {
      toast({ title: "Minimum members required", description: "A shared group must have at least 2 members.", variant: "destructive" });
      return;
    }

    if (editingPoolId && currentPool.id) {
      dispatch({ type: 'UPDATE_CUSTOM_SHARED_POOL', payload: { id: currentPool.id, name: currentPool.name, personIds: currentPool.personIds } });
      toast({ title: "Shared Group Updated", description: `Group "${currentPool.name}" has been updated.` });
    } else {
      dispatch({ type: 'ADD_CUSTOM_SHARED_POOL', payload: { name: currentPool.name, personIds: currentPool.personIds } });
      toast({ title: "Shared Group Created", description: `Group "${currentPool.name}" has been created.` });
    }
    setIsPoolDialogOpen(false);
    setCurrentPool({ name: '', personIds: [] });
    setEditingPoolId(null);
  };

  const handleDeleteCustomPool = (poolId: string) => {
    if (window.confirm("Are you sure you want to delete this shared group? Items assigned to it will become unassigned.")) {
      dispatch({ type: 'DELETE_CUSTOM_SHARED_POOL', payload: poolId });
      toast({ title: "Shared Group Deleted", description: "The shared group has been removed." });
    }
  };

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-6 w-6 text-primary" />
          Manage People & Groups
        </CardTitle>
        <CardDescription>Define who is splitting the bill and create custom shared groups.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* People Management */}
        <div className="space-y-4 p-4 border rounded-md bg-muted/20">
          <h3 className="text-lg font-medium">People</h3>
          <div>
            <Label htmlFor="people-count">Number of People</Label>
            <Input
              id="people-count"
              type="number"
              min="0"
              max="20"
              value={state.people.length}
              onChange={handlePeopleCountChange}
              className="mt-1"
            />
          </div>
          {state.people.length > 0 && (
            <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
              <h4 className="text-md font-medium">Enter Names:</h4>
              {state.people.map((person, index) => (
                <div key={person.id}>
                  <Label htmlFor={`person-name-${person.id}`} className="sr-only">{`Person ${index + 1} Name`}</Label>
                  <Input
                    id={`person-name-${person.id}`}
                    type="text"
                    placeholder={`Person ${index + 1} Name`}
                    value={person.name}
                    onChange={(e) => handleNameChange(person.id, e.target.value)}
                  />
                </div>
              ))}
            </div>
          )}
          {state.people.length > 0 && (
            <Button onClick={handleSavePeople} variant="outline" className="w-full mt-2">
              <Save className="mr-2 h-4 w-4" /> Save People List
            </Button>
          )}
        </div>

        {/* Custom Shared Groups Management */}
        <div className="space-y-4 p-4 border rounded-md bg-muted/20">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">Custom Shared Groups</h3>
            <Dialog open={isPoolDialogOpen} onOpenChange={setIsPoolDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" onClick={() => handleOpenPoolDialog()} disabled={state.people.length < 2}>
                  <PlusCircle className="mr-2 h-4 w-4" /> Create Group
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>{editingPoolId ? "Edit" : "Create"} Custom Shared Group</DialogTitle>
                  <DialogDescription>
                    {editingPoolId ? "Update the" : "Define a"} group name and select members. Groups must have at least 2 members.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="pool-name" className="text-right">
                      Name
                    </Label>
                    <Input
                      id="pool-name"
                      value={currentPool.name || ''}
                      onChange={(e) => handlePoolNameChange(e.target.value)}
                      className="col-span-3"
                      placeholder="e.g., Appetizers, Team Drinks"
                    />
                  </div>
                  <Label className="mt-2">Members</Label>
                  <ScrollArea className="h-[200px] border rounded-md p-2 col-span-4">
                    {state.people.map(person => (
                      <div key={person.id} className="flex items-center space-x-2 py-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleTogglePersonInPool(person.id)}
                          className="w-full justify-start"
                        >
                          {currentPool.personIds.includes(person.id) ? (
                            <CheckSquare className="mr-2 h-4 w-4 text-primary" />
                          ) : (
                            <Square className="mr-2 h-4 w-4 text-muted-foreground" />
                          )}
                          {person.name}
                        </Button>
                      </div>
                    ))}
                  </ScrollArea>
                </div>
                <DialogFooter>
                  <DialogClose asChild>
                     <Button variant="ghost" onClick={() => { setIsPoolDialogOpen(false); setCurrentPool({ name: '', personIds: []}); setEditingPoolId(null);}}>Cancel</Button>
                  </DialogClose>
                  <Button onClick={handleSaveCustomPool}>Save Group</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
          {state.customSharedPools.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {state.people.length < 2 ? "Add at least 2 people to create custom shared groups." : "No custom shared groups yet. Create one to split specific items among selected people."}
            </p>
          ) : (
            <ScrollArea className="h-40 pr-2">
              <ul className="space-y-2">
                {state.customSharedPools.map(pool => (
                  <li key={pool.id} className="flex items-center justify-between p-2 border rounded-md bg-background">
                    <div>
                      <span className="font-medium">{pool.name}</span>
                      <p className="text-xs text-muted-foreground">
                        Members: {pool.personIds.map(pid => state.people.find(p => p.id === pid)?.name || 'Unknown').join(', ') || 'None'}
                      </p>
                    </div>
                    <div className="flex gap-1">
                       <Button variant="ghost" size="icon" onClick={() => handleOpenPoolDialog(pool)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteCustomPool(pool.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            </ScrollArea>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
