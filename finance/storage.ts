import { FinanceEvent } from './events';

export type TransactionType = 'income' | 'expense';
export type ExpenseCategory = 'Essentials' | 'Non-essentials' | 'Debt' | 'Savings' | 'Toxic';
export type IncomeCategory = 'Salary' | 'Freelance' | 'Bonus' | 'Other';
export type PaymentFrequency = 'weekly' | 'biweekly' | 'monthly' | 'irregular';
export type Irregularity = 'about_weekly' | 'about_monthly' | 'few_times_year';

// UI Types shared across components
export type SheetView =
  | 'menu'
  | 'income'
  | 'regular'
  | 'expense'
  | 'transfer'
  | 'withdraw_for_spending'
  | 'return_unused_cash'
  | 'ai_upload'
  | 'ai_review';
  | 'ai_import'
  | 'draft_review';

export interface TransactionDraft {
  type: TransactionType;
  amount: number;
  merchant?: string;
  date?: string;
  category?: ExpenseCategory | IncomeCategory | string;
  notes?: string;
}
export type SheetView = 'menu' | 'income' | 'regular' | 'expense' | 'transfer' | 'withdraw_for_spending' | 'return_unused_cash' | 'draft_review';

export interface Transaction {
  id: string;
  amount: number;
  type: TransactionType;
  category: ExpenseCategory | IncomeCategory;
  note: string;
  date: string; // ISO string
  recurring: boolean;
  frequency?: PaymentFrequency;
  irregularity?: Irregularity;
  sourceFundId?: string; // New: 'emergency' or a goal ID, or undefined for availableBalance
}

export interface TransactionDraft {
  id: string;
  type: TransactionType;
  amount?: number;
  merchant?: string;
  date?: string;
  category?: ExpenseCategory | IncomeCategory;
  notes?: string;
  confidence?: number;
}

export interface Goal {
  id: string;
  name: string;
  targetAmount: number;
  allocatedAmount: number;
  status: 'active' | 'archived';
}

export interface MissionHistoryEntry {
  missionId: string;
  triggerKey: string;
  timestamp: number;
  status: 'completed' | 'skipped';
}

const KEY_EVENTS = 'ch_events_log';

// Deprecated: legacy state loading
const KEY_INCOMES = 'ch_incomes';
const KEY_EXPENSES = 'ch_expenses';

export const loadEvents = (): FinanceEvent[] => {
  try {
    const eventsJson = localStorage.getItem(KEY_EVENTS);
    if (!eventsJson) return [];
    return JSON.parse(eventsJson);
  } catch (error) {
    console.error("Error loading events:", error);
    return [];
  }
};

export const saveEvents = (events: FinanceEvent[]) => {
  try {
    localStorage.setItem(KEY_EVENTS, JSON.stringify(events));
  } catch (error) {
    console.error("Error saving events:", error);
  }
};

// Kept for backward compatibility if needed, but unused in new architecture
export const loadFinanceState = () => {
  try {
    const incomes: Transaction[] = JSON.parse(localStorage.getItem(KEY_INCOMES) || '[]');
    const expenses: Transaction[] = JSON.parse(localStorage.getItem(KEY_EXPENSES) || '[]');
    return { incomes, expenses };
  } catch (error) {
    return { incomes: [], expenses: [] };
  }
};

export const saveFinanceState = (incomes: Transaction[], expenses: Transaction[]) => {
  localStorage.setItem(KEY_INCOMES, JSON.stringify(incomes));
  localStorage.setItem(KEY_EXPENSES, JSON.stringify(expenses));
};