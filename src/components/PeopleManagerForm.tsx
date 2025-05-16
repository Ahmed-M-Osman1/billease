"use client";
import { useBillContext } from '@/contexts/BillContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, UserPlus } from 'lucide-react';
import type { ChangeEvent } from 'react';

export function PeopleManagerForm() {
  const { state, dispatch } = useBillContext();

  const handlePeopleCountChange = (e: ChangeEvent<HTMLInputElement>) => {
    const count = parseInt(e.target.value, 10);
    if (count >= 0 && count <= 20) { // Limit to 20 people
      dispatch({ type: 'SET_PEOPLE_COUNT', payload: count });
    }
  };

  const handleNameChange = (id: string, name: string) => {
    dispatch({ type: 'UPDATE_PERSON_NAME', payload: { id, name } });
  };

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-6 w-6 text-primary" />
          Manage People
        </CardTitle>
        <CardDescription>Enter the number of people and their names.</CardDescription>
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
         {/* 
        Optional: Add person button if managing people one by one, instead of count based.
        For now, count-based approach is simpler as per initial interpretation.
        <Button variant="outline" onClick={() => dispatch({ type: 'ADD_PERSON_FIELD' })}> 
          <UserPlus className="mr-2 h-4 w-4" /> Add Person 
        </Button> 
        */}
      </CardContent>
    </Card>
  );
}
