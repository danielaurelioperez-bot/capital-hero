import { useContext } from 'react';
import { FinanceContext } from '../finance/FinanceContext';
import { 
  Transaction, 
  TransactionType,
  ExpenseCategory,
  IncomeCategory,
  PaymentFrequency,
  Irregularity,
  TransactionDraft
} from '../finance/storage';
import { FinanceSnapshot, NextStep } from '../finance/selectors';

// Re-export types so UI components don't break
export type { Transaction, TransactionType, ExpenseCategory, IncomeCategory, PaymentFrequency, Irregularity, FinanceSnapshot, NextStep };
export type { TransactionDraft };

export const useFinance = () => {
  const context = useContext(FinanceContext);

  if (context === undefined) {
    throw new Error('useFinance must be used within a FinanceProvider');
  }

  return context;
};
