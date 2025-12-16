import { Transaction } from './storage';
import { FinanceState } from './events';

export type StatusLevel = 'Stable' | 'At Risk' | 'In Trouble';

export interface ComputedStatus {
  totalIncome: number;
  totalExpenses: number;
  net: number;
  status: StatusLevel;
  statusMessage: string;
  storyContext: string;
  weeklySafeSpend: number;
  weeklyNonEssential: number;
}

export const computeStatus = (state: FinanceState, daysOffline: number = 0, referenceDate: Date = new Date()): ComputedStatus => {
  const { incomes, expenses } = state;
  const currentMonth = referenceDate.getMonth();
  const currentYear = referenceDate.getFullYear();

  // 1. Current Month Actuals
  const isThisMonth = (t: Transaction) => {
    const d = new Date(t.date);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  };

  const actualIncomeThisMonth = incomes.filter(isThisMonth).reduce((acc, t) => acc + t.amount, 0);
  const actualExpensesThisMonth = expenses.filter(isThisMonth).reduce((acc, t) => acc + t.amount, 0);
  const net = actualIncomeThisMonth - actualExpensesThisMonth;

  // 2. Identify Recurring Templates (Logic: Income by Category, Expenses by Note/Name)
  const incomeTemplates = new Map<string, number>(); 
  incomes.filter(t => t.recurring).forEach(t => {
    // For income, we stick to category grouping for simplicity (e.g. total 'Salary' expected)
    incomeTemplates.set(t.category, t.amount);
  });
  
  const expenseTemplates = new Map<string, number>();
  // Filter out irregular frequencies from automatic monthly projections
  expenses.filter(t => t.recurring && t.frequency !== 'irregular').forEach(t => {
    // For expenses, we use the Note (Bill Name) as the unique identifier.
    // This allows "Rent" and "Electricity" (both Essentials) to be tracked separately.
    // Fallback to category if note is missing.
    const key = t.note ? t.note.trim().toLowerCase() : t.category;
    expenseTemplates.set(key, t.amount);
  });

  // 3. Calculate Pending Items (The "Gap")
  let expectedRecurringIncome = 0;
  incomeTemplates.forEach((amount, category) => {
    // Check if ANY transaction of this category occurred this month
    const paid = incomes.some(t => isThisMonth(t) && t.category === category);
    if (!paid) expectedRecurringIncome += amount;
  });

  let pendingBills = 0;
  expenseTemplates.forEach((amount, key) => {
    // Check if this specific bill (by note) was paid
    const paid = expenses.some(t => {
      if (!isThisMonth(t)) return false;
      const tKey = t.note ? t.note.trim().toLowerCase() : t.category;
      return tKey === key;
    });
    if (!paid) pendingBills += amount;
  });

  // 4. Calculate Liquidity (Global Cash On Hand)
  const totalLifetimeIncome = incomes.reduce((acc, t) => acc + t.amount, 0);
  const totalLifetimeExpenses = expenses.reduce((acc, t) => acc + t.amount, 0);
  const globalLiquidity = totalLifetimeIncome - totalLifetimeExpenses;

  // 5. Projected Solvency
  // Current Cash + (Money Coming In) - (Bills We Must Pay)
  const projectedEoM = globalLiquidity + expectedRecurringIncome - pendingBills;

  // 6. Status Logic (Hardened)
  let status: StatusLevel = 'At Risk';

  // Rule 1: Insolvency. If we are projected to be negative, we are In Trouble.
  // We ignore current globalLiquidity < 0 if projectedEoM is positive (e.g. about to receive huge salary today).
  // But generally, if cash is negative, it's trouble.
  if (globalLiquidity < -100 || projectedEoM < 0) {
    status = 'In Trouble';
  }
  // Rule 2: Stability. We need a positive projection and a small buffer.
  // Buffer: 10% of monthly income or $100, whichever is larger.
  else if (projectedEoM > Math.max(100, (expectedRecurringIncome + actualIncomeThisMonth) * 0.1)) {
    status = 'Stable';
  }
  // Rule 3: The middle ground is 'At Risk' (Positive, but tight).

  // 7. Breakdown for Guardrails
  const nonEssentialExpenses = expenses
    .filter(e => isThisMonth(e) && (e.category === 'Non-essentials' || e.category === 'Toxic'))
    .reduce((acc, curr) => acc + curr.amount, 0);

  // Safe Spend: 25% of the *projected* surplus.
  const weeklySafeSpend = projectedEoM > 0 ? Math.floor(projectedEoM / 4) : 0;
  const weeklyNonEssential = Math.floor(nonEssentialExpenses / 4); // Avg per week so far

  // Narrative - COACHING ENGINE (Grounded & Direct)
  let statusMessage = '';
  let storyContext = '';

  // RE-ENGAGEMENT OVERRIDE
  if (daysOffline >= 2) {
    // Calm, welcoming, no guilt.
    statusMessage = "Welcome back. Let's make sure your numbers are still accurate.";
    storyContext = "Consistency beats perfection. Just check in.";
  } else {
    // Standard logic
    statusMessage = {
      'Stable': 'You have a solid buffer. Stick to the plan.',
      'At Risk': 'Money is tight this month. Be careful with optional spending.',
      'In Trouble': 'Critical situation. Focus ONLY on paying essential bills.',
    }[status];

    storyContext = {
      'Stable': 'Your savings are growing.',
      'At Risk': 'One large expense could cause a problem.',
      'In Trouble': 'Avoid all non-essential spending today.',
    }[status];
  }

  return {
    totalIncome: actualIncomeThisMonth,
    totalExpenses: actualExpensesThisMonth,
    net, 
    status,
    statusMessage,
    storyContext,
    weeklySafeSpend,
    weeklyNonEssential,
  };
};