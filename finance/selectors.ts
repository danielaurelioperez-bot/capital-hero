import { FinanceState } from './events';
import { Transaction, Goal } from './storage';
import { ComputedStatus } from './computeStatus';


export interface FinanceSnapshot {
  status: 'Stable' | 'At Risk' | 'In Trouble';
  coveredUntil: string;
  runwayDays: number;
  nextThreat: {
    name: string;
    amount: number;
    date: string;
    daysUntil: number;
  } | null;
  liquidity: number; // Total Net Assets (Global)
  availableBalance: number; // Liquid cash NOT in buckets
  
  // Savings Breakdown
  totalSavings: number; // Unallocated + All Goals
  unallocatedSavings: number; // Pure Savings
  goals: Goal[]; // Active Goals

  emergencyFund: number; // Emergency Bucket
  incomeStability: 'Steady' | 'Unpredictable';
}

export interface ProgressInsights {
  trend: 'improving' | 'declining' | 'stable';
  title: string;
  message: string;
}

// Next steps types and selector are defined below (kept concise)

const formatRelativeDate = (days: number): string => {
  if (days < 0) return "Overdue";
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days < 7) return new Date(Date.now() + days * 86400000).toLocaleDateString('en-US', { weekday: 'long' });
  return `${days} days`;
};

// Helper: Check if a specific recurring item has been paid
const isBillPaidThisMonth = (key: string, currentMonthExpenses: Transaction[]): boolean => {
  return currentMonthExpenses.some(t => {
     const tKey = t.note ? t.note.trim().toLowerCase() : t.category;
     return tKey === key;
  });
};

export const getFinanceSnapshot = (state: FinanceState): FinanceSnapshot => {
  const { incomes, expenses, savingsBalance, emergencyFundBalance, goals } = state;
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  
  // 1. Calculate Global Liquidity (Total Cash Position)
  const totalIncome = incomes.reduce((acc, t) => acc + t.amount, 0);
  const totalExpenses = expenses.reduce((acc, t) => acc + t.amount, 0);
  const liquidity = totalIncome - totalExpenses;

  // 1b. Calculate Buckets
  const unallocatedSavings = Math.max(0, savingsBalance || 0);
  const safeEmergency = Math.max(0, emergencyFundBalance || 0);
  
  const activeGoals = (goals || []).filter(g => g.status === 'active');
  const goalsTotal = activeGoals.reduce((acc, g) => acc + g.allocatedAmount, 0);

  // Total Savings Wealth = Unallocated + Goals
  const totalSavings = unallocatedSavings + goalsTotal;

  // Available = Liquidity - (Total Savings + Emergency)
  const availableBalance = liquidity - totalSavings - safeEmergency;

  // 1c. Income Stability
  const hasIrregularIncome = incomes.some(t => t.frequency === 'irregular' || t.irregularity !== undefined);
  const incomeStability = hasIrregularIncome ? 'Unpredictable' : 'Steady';

  // 2. Identify Active Recurring Commitments (Bill Definitions)
  const recurringMap = new Map<string, Transaction>();
  
  expenses.filter(e => e.recurring && e.frequency !== 'irregular').forEach(e => {
    const key = e.note ? e.note.trim().toLowerCase() : e.category;
    const existing = recurringMap.get(key);
    if (!existing || new Date(e.date) > new Date(existing.date)) {
      recurringMap.set(key, e);
    }
  });

  const currentMonthExpenses = expenses.filter(t => {
    const d = new Date(t.date);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });

  // 3. Find Next Threat
  let nextThreat = null;
  const potentialThreats: any[] = [];
  let pendingBillsAmount = 0;

  recurringMap.forEach((template, key) => {
    const isPaid = isBillPaidThisMonth(key, currentMonthExpenses);
    
    const originalDate = new Date(template.date);
    let targetDay = originalDate.getDate();
    
    let targetDate = new Date(currentYear, currentMonth, targetDay);
    if (isPaid) {
      targetDate = new Date(currentYear, currentMonth + 1, targetDay);
    } else {
       pendingBillsAmount += template.amount;
    }

    const diffTime = targetDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 

    potentialThreats.push({
      name: template.note || template.category, 
      amount: template.amount,
      date: targetDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      daysUntil: diffDays,
      isOverdue: !isPaid && diffDays < 0
    });
  });

  potentialThreats.sort((a, b) => a.daysUntil - b.daysUntil);
  if (potentialThreats.length > 0) nextThreat = potentialThreats[0];

  // 4. Runway Calculation
  let monthlyFixedCost = 0;
  recurringMap.forEach(t => monthlyFixedCost += t.amount);
  const dailyBurn = monthlyFixedCost > 0 ? (monthlyFixedCost / 30) : 10; 

  let coveredUntil = "Unknown";
  let runwayDays = 0;

  if (liquidity < 0) {
    coveredUntil = "Immediate Action Needed";
    runwayDays = 0;
  } else if (dailyBurn <= 0) {
     coveredUntil = "Indefinite";
     runwayDays = 9999;
  } else {
    const daysOfRunway = Math.floor(liquidity / dailyBurn);
    runwayDays = daysOfRunway;
    if (daysOfRunway > 90) coveredUntil = "Safe (>3 Months)";
    else if (daysOfRunway > 30) coveredUntil = "Stable (>30 Days)";
    else coveredUntil = formatRelativeDate(daysOfRunway);
  }

  // 5. Status Derivation
  let status: 'Stable' | 'At Risk' | 'In Trouble' = 'At Risk';
  const projectedLiquidityAfterBills = availableBalance - pendingBillsAmount; 
  
  if (liquidity < -100 || (liquidity - pendingBillsAmount) < 0) {
      status = 'In Trouble';
  } else if (projectedLiquidityAfterBills > (monthlyFixedCost * 0.1) && runwayDays > 14) {
      status = 'Stable';
  }

  return {
    status,
    coveredUntil,
    nextThreat,
    liquidity,
    availableBalance,
    totalSavings,
    unallocatedSavings,
    goals: activeGoals,
    emergencyFund: safeEmergency,
    runwayDays,
    incomeStability
  };
};

export const getProgressInsights = (state: FinanceState): ProgressInsights => {
  const { expenses } = state;
  const now = new Date();
  const oneDay = 24 * 60 * 60 * 1000;

  const getExpensesInWindow = (startDaysAgo: number, endDaysAgo: number) => {
    return expenses.filter(t => {
      const d = new Date(t.date);
      const diffTime = now.getTime() - d.getTime();
      const diffDays = diffTime / oneDay;
      return diffDays >= startDaysAgo && diffDays < endDaysAgo;
    });
  };

  const currentWeek = getExpensesInWindow(0, 7);
  const previousWeek = getExpensesInWindow(7, 14);

  const countToxicDays = (txs: Transaction[]) => {
      const days = new Set(txs.filter(t => t.category === 'Toxic').map(t => t.date.split('T')[0]));
      return days.size;
  };

  const currentToxicDays = countToxicDays(currentWeek);
  const prevToxicDays = countToxicDays(previousWeek);

  const sumNonEssential = (txs: Transaction[]) => 
      txs.filter(t => t.category === 'Non-essentials' || t.category === 'Toxic')
         .reduce((acc, t) => acc + t.amount, 0);
  
  const currentSpend = sumNonEssential(currentWeek);
  const prevSpend = sumNonEssential(previousWeek);

  if (currentToxicDays < prevToxicDays) {
      return { trend: 'improving', title: "Fewer Danger Days", message: "Discipline is improving." };
  }
  if (currentToxicDays > prevToxicDays) {
      return { trend: 'declining', title: "Danger Days Detected", message: "Toxic spending increased." };
  }
  if (currentSpend < prevSpend * 0.9) {
      return { trend: 'improving', title: "Safer Week", message: "Spending trending down." };
  }
  if (currentSpend > prevSpend * 1.1) {
       return { trend: 'declining', title: "Turbulence", message: "Spending trending up." };
  }
  return { trend: 'stable', title: "Holding the Line", message: "Consistent patterns." };
};

export type NextStepActionType = 'allocate_emergency' | 'reduce_spending' | 'increase_income' | 'build_savings' | 'pay_bills';

export interface NextStep {
  action: NextStepActionType;
  title: string;
  message: string;
  priority: number;
}

export const selectNextSteps = (state: FinanceState, summary: ComputedStatus, limit: number = 5): NextStep[] => {
  const snapshot = getFinanceSnapshot(state);
  const steps: NextStep[] = [];

  if (summary.status === 'In Trouble') {
    steps.push({
      action: 'allocate_emergency',
      title: 'Build Emergency Fund',
      message: 'Allocate money to emergency fund to cover immediate needs.',
      priority: 1
    });
  }

  if (snapshot.availableBalance < 0 || snapshot.runwayDays <= 7) {
    steps.push({
      action: 'reduce_spending',
      title: 'Reduce Spending',
      message: 'Cut non-essential expenses to improve cash flow.',
      priority: 2
    });
  }

  if (summary.status === 'At Risk') {
    steps.push({
      action: 'build_savings',
      title: 'Build Savings',
      message: 'Increase savings to create a safety buffer.',
      priority: 3
    });
  }

  if (summary.status === 'Stable') {
    steps.push({
      action: 'increase_income',
      title: 'Increase Income',
      message: 'Look for ways to boost your income streams.',
      priority: 4
    });
  }

  // Sort by priority (lower number = higher priority)
  steps.sort((a, b) => a.priority - b.priority);

  return steps.slice(0, limit);
};
