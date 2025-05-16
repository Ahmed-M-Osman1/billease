
export interface BillItem {
  id: string;
  name: string;
  price: number;
  assignedTo: string | null; // personId, customSharedPoolId, 'SHARED_ALL_PEOPLE', or null if unassigned
}

export interface Person {
  id: string;
  name: string;
}

export interface CustomSharedPool {
  id: string;
  name: string;
  personIds: string[]; // IDs of people in this specific pool
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
  sharedItemsPortionValue: number; // Value from 'SHARED_ALL_PEOPLE' items
  customSharedPoolContributions?: Array<{ poolId: string; poolName: string; amount: number }>; // Contributions from custom shared pools
  totalDue: number;
}

