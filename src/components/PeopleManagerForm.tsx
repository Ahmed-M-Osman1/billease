
"use client";
import { useBillContext } from '@/contexts/BillContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Save } from 'lucide-react';
import type { ChangeEvent } from 'react';
import { useToast } from '@/hooks/use-toast';

export function PeopleManagerForm() {
  const { state, dispatch } = useBillContext();
  const { toast } = useToast();

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
      console.error("Error saving people to local storage:", error);
      toast({
        title: "Error Saving People",
        description: "Could not save people to local storage.",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-6 w-6 text-primary" />
          Manage People
        </CardTitle>
        <CardDescription>Enter the number of people and their names. You can save the list for later use.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
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
            <h3 className="text-md font-medium">Enter Names:</h3>
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
      </CardContent>
    </Card>
  );
}
