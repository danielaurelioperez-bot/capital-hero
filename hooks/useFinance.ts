import { useContext } from 'react';
import { FinanceContext } from '../finance/FinanceContext';
import { 
  Transaction, 
  TransactionType, 
  ExpenseCategory, 
  IncomeCategory,
  PaymentFrequency,
  Irregularity
} from '../finance/storage';
import { FinanceSnapshot } from '../finance/selectors';

// Re-export types so UI components don't break
export type { Transaction, TransactionType, ExpenseCategory, IncomeCategory, PaymentFrequency, Irregularity, FinanceSnapshot };

export const useFinance = () => {
  const context = useContext(FinanceContext);

  if (context === undefined) {
    throw new Error('useFinance must be used within a FinanceProvider');
  }

  return context;
};