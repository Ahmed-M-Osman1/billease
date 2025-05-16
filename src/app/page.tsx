"use client";
import { BillProvider, useBillContext } from '@/contexts/BillContext';
import { AppHeader } from '@/components/AppHeader';
import { BillUploadForm } from '@/components/BillUploadForm';
import { PeopleManagerForm } from '@/components/PeopleManagerForm';
import { BillItemsManager } from '@/components/BillItemsManager';
import { ItemAssignmentArea } from '@/components/ItemAssignmentArea';
import { SummaryDisplay } from '@/components/SummaryDisplay';
import { Button } from '@/components/ui/button';
import { RotateCcw } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

function BillEaseApp() {
  const { dispatch } = useBillContext();

  const handleResetApp = () => {
    if (window.confirm("Are you sure you want to reset all data? This action cannot be undone.")) {
      dispatch({ type: 'RESET_ALL_DATA' });
      // Clear file input manually if needed, or rely on SET_BILL_IMAGE clearing relevant state
      const fileInput = document.getElementById('bill-image') as HTMLInputElement | null;
      if (fileInput) {
        fileInput.value = '';
      }
    }
  };
  
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <AppHeader />
      <main className="flex-grow container mx-auto p-4 md:p-6 lg:p-8 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Column 1: Inputs & Bill Item Management */}
          <div className="lg:col-span-1 space-y-6">
            <BillUploadForm />
            <PeopleManagerForm />
            <BillItemsManager />
          </div>

          {/* Column 2: Item Assignment & Summary */}
          <div className="lg:col-span-2 space-y-6">
            <ItemAssignmentArea />
            <SummaryDisplay />
          </div>
        </div>
        
        <div className="mt-8 pt-6 border-t flex justify-end">
            <Button variant="destructive" onClick={handleResetApp} className="bg-destructive hover:bg-destructive/90">
              <RotateCcw className="mr-2 h-4 w-4" /> Reset Entire App
            </Button>
        </div>
        
        <Card className="mt-8 bg-muted/30">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-2">How to Use BillEase:</h3>
            <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
              <li><strong className="text-foreground/80">Upload Bill:</strong> Click to upload a clear photo of your bill. Then click "Extract Items".</li>
              <li><strong className="text-foreground/80">Add People:</strong> Enter the number of people splitting the bill and their names.</li>
              <li><strong className="text-foreground/80">Review Items:</strong> Check the extracted items and totals. Edit, add, or delete items as needed.</li>
              <li><strong className="text-foreground/80">Assign Items:</strong> Drag items from "Unassigned" to each person. Use the AI Suggestion for help!</li>
              <li><strong className="text-foreground/80">View Summary:</strong> See the breakdown per person and the grand total. Print if needed.</li>
            </ol>
          </CardContent>
        </Card>

      </main>
      <footer className="py-4 text-center text-sm text-muted-foreground border-t">
        BillEase &copy; {new Date().getFullYear()} - Split bills effortlessly.
      </footer>
    </div>
  );
}

export default function Home() {
  return (
    <BillProvider>
      <BillEaseApp />
    </BillProvider>
  );
}
