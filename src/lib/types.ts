// ========================
// Existing types (preserved for AI flow compatibility)
// ========================

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
  kind?: 'manual' | 'auto';
}

export interface BillDetails {
  subtotal: number;
  vat: number;
  serviceCharge: number;
  delivery: number;
}

export interface CalculatedPersonSummary extends Person {
  items: BillItem[]; // Directly assigned items
  itemsSubtotal: number; // Subtotal of directly assigned items
  vatShare: number;
  serviceChargeShare: number;
  sharedItemsPortionValue: number; // Value from 'SHARED_ALL_PEOPLE' items
  customSharedPoolContributions?: Array<{
    poolId: string;
    poolName: string;
    amount: number;
  }>; // Contributions from custom shared pools
  totalDue: number;
}

// ========================
// New types for full app
// ========================

export type BillStatus = 'draft' | 'active' | 'settled';
export type TipMode = 'none' | 'pre_tax' | 'post_tax';
export type WizardStep = 0 | 1 | 2;
export type AssignmentType = 'individual' | 'shared_all' | 'shared_group';
export type ThemePreference = 'light' | 'dark' | 'system';
export type OcrPriceMode = 'unit' | 'total';

export interface Profile {
  id: string;
  full_name: string;
  avatar_url: string | null;
  currency: string;
  theme: ThemePreference;
  created_at: string;
  updated_at: string;
}

export interface Friend {
  id: string;
  user_id: string;
  friend_id: string;
  nickname: string | null;
  created_at: string;
  profile?: Profile; // joined data
}

export interface Group {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
  members?: Profile[];
}

export interface Bill {
  id: string;
  user_id: string;
  title: string;
  image_url: string | null;
  date: string;
  currency: string;
  subtotal: number;
  vat: number;
  service_charge: number;
  delivery: number;
  tip: number;
  tip_mode: TipMode;
  status: BillStatus;
  share_token: string | null;
  is_collaborative: boolean;
  created_at: string;
  updated_at: string;
}

export interface BillParticipant {
  id: string;
  bill_id: string;
  profile_id: string | null;
  name: string;
  color: string | null;
  is_settled: boolean;
  settled_at: string | null;
}

export interface BillItemDB {
  id: string;
  bill_id: string;
  name: string;
  price: number;
  quantity: number;
  assigned_to: string | null;
  assignment_type: AssignmentType;
  shared_group_id: string | null;
}

export interface BillSplitGroup {
  id: string;
  bill_id: string;
  name: string;
}

export interface Settlement {
  id: string;
  bill_id: string;
  from_id: string;
  to_id: string;
  amount: number;
  is_paid: boolean;
  paid_at: string | null;
}

export interface BillWithDetails extends Bill {
  participants: BillParticipant[];
  items: BillItemDB[];
  split_groups: BillSplitGroup[];
  settlements: Settlement[];
}

export interface WizardPerson extends Person {
  color: string;
}
