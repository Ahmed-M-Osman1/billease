export const CURRENCIES = [
  { code: 'EGP', symbol: 'EGP', name: 'Egyptian Pound' },
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'SAR', symbol: 'SAR', name: 'Saudi Riyal' },
  { code: 'AED', symbol: 'AED', name: 'UAE Dirham' },
  { code: 'KWD', symbol: 'KWD', name: 'Kuwaiti Dinar' },
] as const;

export const TIP_PRESETS = [10, 15, 20] as const;

export const PERSON_COLORS = [
  '#3b82f6', // blue
  '#ef4444', // red
  '#22c55e', // green
  '#f59e0b', // amber
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#f97316', // orange
  '#14b8a6', // teal
  '#6366f1', // indigo
  '#84cc16', // lime
  '#e11d48', // rose
] as const;

export const WIZARD_STEPS = [
  { index: 0, label: 'Upload', description: 'Upload & extract bill items' },
  { index: 1, label: 'People', description: 'Add people to the bill' },
  { index: 2, label: 'Share', description: 'Share links & everyone claims their items' },
] as const;

export const SHARED_ALL_PEOPLE = 'SHARED_ALL_PEOPLE' as const;

export function getCurrencySymbol(code: string): string {
  return CURRENCIES.find(c => c.code === code)?.symbol ?? code;
}
