export interface BillItem {
  id: string;
  name: string;
  price: number;
  assignedTo: string | null | 'SHARED'; // personId, null if unassigned, or 'SHARED'
}

export interface Person {
  id: string;
  name: string;
}

export interface BillDetails {
  subtotal: number;
  vat: number;
  serviceCharge: number;
}

export interface CalculatedPersonSummary extends Person {
  items: BillItem[]; // Directly assigned items
  itemsSubtotal: number; // Subtotal of directly assigned items
  vatShare: number;
  serviceChargeShare: number;
  sharedItemsPortionValue: number; // Value of shared items this person is responsible for
  totalDue: number;
}
