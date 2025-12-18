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

export type NextStepActionType = 'sheet' | 'navigate' | 'none';

export interface NextStep {
  missionId: string;
  title: string;
  description: string;
  impactText: string;
  ctaLabel: string;
  actionType: NextStepActionType;
  actionPayload: string | null;
  isBlocked: boolean;
  blockedReason: string | null;
}

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

<<<<<<< HEAD
// --- NEXT STEPS SELECTOR ---

const PRIORITY_RANK: Record<string, number> = {
  // Riesgo inmediato / datos esenciales faltantes
  check_balances: 0,
  add_income: 0,
  add_recurring: 0,
  // Pagos recurrentes / préstamos próximos
  cover_threat: 1,
  // Daily log si falta
  daily_checkin: 2,
  // Savings / emergency fund si hay margen
  start_emergency: 3,
  assign_surplus: 3,
  // Optimización suave / estado
  system_stable: 4,
  no_missions_yet: 5,
};

const PRIORITY_SCORE: Record<string, number> = {
  check_balances: 1,
  cover_threat: 5,
  add_income: 10,
  add_recurring: 11,
  daily_checkin: 20,
  assign_surplus: 30,
  start_emergency: 40,
  system_stable: 900,
  no_missions_yet: 1000,
};

const wasSkippedRecently = (
  history: FinanceState['missionHistory'], 
  missionId: string, 
  triggerKey: string, 
  hours: number = 4
) => {
  if (!hours || hours <= 0) return false;
  const skips = history
    .filter(h => h.missionId === missionId && h.triggerKey === triggerKey && h.status === 'skipped')
    .sort((a, b) => b.timestamp - a.timestamp);
  
  if (skips.length === 0) return false;
  const lastSkipped = skips[0].timestamp;
  const diffHours = (Date.now() - lastSkipped) / (1000 * 60 * 60);
  return diffHours < hours;
};

const isCompleted = (
  history: FinanceState['missionHistory'], 
  missionId: string, 
  triggerKey: string
) => history.some(h => h.missionId === missionId && h.triggerKey === triggerKey && h.status === 'completed');

const sortByPriority = (a: { missionId: string; priority: number; score: number }, b: { missionId: string; priority: number; score: number }) => {
  if (a.priority !== b.priority) return a.priority - b.priority;
  return a.score - b.score;
};

export const selectNextSteps = (state: FinanceState, limit: number = 5): NextStep[] => {
  const snapshot = getFinanceSnapshot(state);
  const missionHistory = state.missionHistory || [];
  const today = new Date().toISOString().split('T')[0];
  const seen = new Set<string>();

  const addCandidate = (
    missionId: string,
    triggerKey: string,
    builder: () => NextStep | null,
    cooldownHours: number = 4
  ) => {
    const key = `${missionId}::${triggerKey}`;
    if (seen.has(key)) return;
    if (isCompleted(missionHistory, missionId, triggerKey)) return;
    if (wasSkippedRecently(missionHistory, missionId, triggerKey, cooldownHours)) return;

    const nextStep = builder();
    if (!nextStep) return;

    seen.add(key);
    candidates.push({
      missionId,
      priority: PRIORITY_RANK[missionId] ?? 99,
      score: PRIORITY_SCORE[missionId] ?? 9999,
      step: { ...nextStep, missionId },
    });
  };

  const candidates: { missionId: string; priority: number; score: number; step: NextStep }[] = [];

  // 1) Riesgo inmediato / datos esenciales faltantes
  if (snapshot.status === 'In Trouble' || snapshot.availableBalance < 0) {
    addCandidate(
      'check_balances',
      `stability_${snapshot.runwayDays}_${Math.floor(snapshot.availableBalance)}`,
      () => ({
        missionId: 'check_balances',
        title: "Verifica tus saldos",
        description: "Estás en terreno peligroso. Revisa cuentas y recorta gastos urgentes para recuperar control.",
        impactText: "Validar los saldos reales evita decisiones basadas en datos rotos.",
        ctaLabel: "Abrir panel",
        actionType: 'sheet',
        actionPayload: 'menu',
        isBlocked: false,
        blockedReason: null,
      }),
    );
  }

  if (state.incomes.length === 0) {
    addCandidate(
      'add_income',
      'setup_income',
      () => ({
        missionId: 'add_income',
        title: "Log Main Income",
        description: "We can't plan without fuel. Add your primary salary or income source to start.",
        impactText: "Sin ingresos registrados, no se pueden calcular amenazas ni metas.",
        ctaLabel: "Add Income",
        actionType: 'sheet',
        actionPayload: 'income',
        isBlocked: false,
        blockedReason: null,
      })
    );
  }

  const hasRecurring = state.expenses.some(t => t.recurring);
  if (!hasRecurring) {
    addCandidate(
      'add_recurring',
      'setup_recurring',
      () => ({
        missionId: 'add_recurring',
        title: "Add a Fixed Expense",
        description: "Rent, Netflix, Loan... Add one recurring bill so I can calculate your survival costs.",
        impactText: "Sin gastos fijos, el cálculo de runway y amenazas queda incompleto.",
        ctaLabel: "Add Bill",
        actionType: 'sheet',
        actionPayload: 'regular',
        isBlocked: false,
        blockedReason: null,
      })
    );
  }

  // 2) Pagos recurrentes / préstamos próximos
  if (snapshot.nextThreat && snapshot.nextThreat.daysUntil <= 7) {
    const threat = snapshot.nextThreat;
    addCandidate(
      'cover_threat',
      `pay_${threat.name.replace(/\s+/g, '_')}_${threat.date}`,
      () => {
        const blocked = snapshot.availableBalance < threat.amount;
        return {
          missionId: 'cover_threat',
          title: `Upcoming: ${threat.name}`,
          description: `This bill ($${threat.amount}) is due in ${threat.daysUntil === 0 ? 'hours' : `${threat.daysUntil} days`}. Ensure you have the cash.`,
          impactText: "Cubrir los pagos recurrentes evita descubiertos y cargos extras.",
          ctaLabel: "Manage Bills",
          actionType: 'sheet',
          actionPayload: 'regular',
          isBlocked: blocked,
          blockedReason: blocked ? "Saldo disponible insuficiente para cubrir este pago." : null,
        };
      }
    );
  }

  // 3) Daily log si falta
  const hasTxToday = state.incomes.some(t => t.date.startsWith(today)) || state.expenses.some(t => t.date.startsWith(today));
  const checkedInToday = missionHistory.some(h => h.missionId === 'daily_checkin' && new Date(h.timestamp).toISOString().startsWith(today));
  if (!hasTxToday && !checkedInToday) {
    addCandidate(
      'daily_checkin',
      `checkin_${today}`,
      () => ({
        missionId: 'daily_checkin',
        title: "Daily Log",
        description: "No activity recorded today. Did you spend money? If not, confirm 'No Spend' by skipping or logging $0.",
        impactText: "Registrar el día evita huecos y mantiene la disciplina diaria.",
        ctaLabel: "Log Activity",
        actionType: 'sheet',
        actionPayload: 'menu',
        isBlocked: false,
        blockedReason: null,
      })
    );
  }

  // 4) Savings / emergency fund si hay margen
  if (snapshot.emergencyFund === 0 && snapshot.unallocatedSavings > 0) {
    addCandidate(
      'start_emergency',
      'init_emergency',
      () => ({
        missionId: 'start_emergency',
        title: "Start Emergency Fund",
        description: "Your safety net is empty. Allocate even $1 to start building your protection.",
        impactText: "Un colchón de emergencia reduce el riesgo ante imprevistos.",
        ctaLabel: "Fund Safety Net",
        actionType: 'navigate',
        actionPayload: '/progress',
        isBlocked: false,
        blockedReason: null,
      })
    );
  }

  if (snapshot.unallocatedSavings > 10) {
    addCandidate(
      'assign_surplus',
      `assign_${Math.floor(snapshot.unallocatedSavings)}`,
      () => ({
        missionId: 'assign_surplus',
        title: "Give Every Dollar a Job",
        description: `You have $${snapshot.unallocatedSavings.toLocaleString()} sitting in Unallocated Cash. Move it to a Goal or Emergency Fund.`,
        impactText: "Asignar excedentes acelera metas y mantiene el control.",
        ctaLabel: "Allocate Cash",
        actionType: 'navigate',
        actionPayload: '/progress',
        isBlocked: false,
        blockedReason: null,
      })
    );
  }

  // 5) Optimización suave / estado
  if (state.incomes.length > 0) {
    addCandidate(
      'system_stable',
      'system_stable_present',
      () => ({
        missionId: 'system_stable',
        title: "All Systems Operational",
        description: "You are up to date. No immediate risks detected. You remain in control.",
        impactText: "Sin alertas críticas. Mantén el ritmo.",
        ctaLabel: "View Control Panel",
        actionType: 'navigate',
        actionPayload: '/progress',
        isBlocked: false,
        blockedReason: null,
      }),
      2 // Respect original cooldown for this status update
    );
  }

  // Fallback final
  addCandidate(
    'no_missions_yet',
    'no_missions_available',
    () => ({
      missionId: 'no_missions_yet',
      title: "Nothing for you right now.",
      description: "All tasks are complete or on cooldown. Enjoy this quiet moment, or check back later!",
      impactText: "Sin acciones pendientes en este momento.",
      ctaLabel: "Take a break",
      actionType: 'navigate',
      actionPayload: '/',
      isBlocked: false,
      blockedReason: null,
    }),
    0
  );

  return candidates
    .sort(sortByPriority)
    .slice(0, limit)
    .map(c => c.step);
};
=======
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
>>>>>>> d7c2748 (feat(next-steps): map actions to sheets, add prefills and tests)
