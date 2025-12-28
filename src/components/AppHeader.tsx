"use client";
import { HandCoins } from 'lucide-react'; // Using Sparkles as a placeholder for a logo-like icon

export function AppHeader() {
  return (
    <header className="py-6 px-4 md:px-8 border-b border-border/50">
      <div className="container mx-auto flex items-center gap-3">
        <HandCoins className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
            BillEasy
        </h1>
      </div>
    </header>
  );
}
