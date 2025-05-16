export interface BillItem {
  id: string;
  name: string;
  price: number;
  assignedTo: string | null; // personId or null if unassigned
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
  items: BillItem[];
  itemsSubtotal: number;
  vatShare: number;
  serviceChargeShare: number;
  totalDue: number;
}
