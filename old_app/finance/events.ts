import { Transaction, TransactionType, MissionHistoryEntry, Goal } from './storage';

// Base payloads
type FinanceEventAction = 
  | { type: 'ADD_TRANSACTION'; payload: Transaction }
  | { type: 'DELETE_TRANSACTION'; payload: { id: string; type: TransactionType } }
  | { type: 'UPDATE_TRANSACTION'; payload: Transaction }
  | { type: 'MISSION_COMPLETED'; payload: { missionId: string; triggerKey: string; timestamp: number } }
  | { type: 'MISSION_SKIPPED'; payload: { missionId: string; triggerKey: string; timestamp: number } }
  // BUCKET EVENTS
  | { type: 'ALLOCATE_TO_SAVINGS'; payload: { amount: number; note?: string } }
  | { type: 'WITHDRAW_FROM_SAVINGS'; payload: { amount: number; note?: string } }
  | { type: 'ALLOCATE_TO_EMERGENCY'; payload: { amount: number; note?: string } }
  | { type: 'WITHDRAW_FROM_EMERGENCY'; payload: { amount: number; note?: string } }
  // GOAL EVENTS
  | { type: 'GOAL_CREATED'; payload: { id: string; name: string; targetAmount: number } }
  | { type: 'GOAL_UPDATED'; payload: { id: string; name?: string; targetAmount?: number } }
  | { type: 'GOAL_ARCHIVED'; payload: { id: string } }
  | { type: 'ALLOCATE_SAVINGS_TO_GOAL'; payload: { goalId: string; amount: number } }
  | { type: 'WITHDRAW_GOAL_TO_SAVINGS'; payload: { goalId: string; amount: number } }
  // NEW ALLOCATION EVENT
  | { type: 'ALLOCATE_UNALLOCATED_TO_EMERGENCY'; payload: { amount: number } }
  | { type: 'UNDO_ALLOCATE_UNALLOCATED_TO_EMERGENCY'; payload: { amount: number } } // Composite Undo Event
  // NEW: WITHDRAW FOR SPENDING FLOW EVENTS
  | { type: 'INITIATE_SPENDING_WITHDRAWAL'; payload: { amount: number; sourceFundId: string } }
  | { type: 'RETURN_SPENDING_WITHDRAWAL'; payload: { amount: number; sourceFundId: string } };

// Full Event wrapper
export type FinanceEvent = FinanceEventAction & {
  id: string;
  timestamp: number;
  reversesEventId?: string;
};

export interface FinanceState {
  incomes: Transaction[];
  expenses: Transaction[];
  missionHistory: MissionHistoryEntry[];
  xp: number;
  savingsBalance: number; // Unallocated Savings
  emergencyFundBalance: number;
  goals: Goal[]; // Sub-buckets
  // For tracking the "withdraw for spending" flow
  lastWithdrawalForSpending: { initialAmount: number; sourceFundId: string; timestamp: number } | null;
}

export const initialState: FinanceState = {
  incomes: [],
  expenses: [],
  missionHistory: [],
  xp: 0,
  savingsBalance: 0,
  emergencyFundBalance: 0,
  goals: [],
  lastWithdrawalForSpending: null,
};

export const applyEvent = (state: FinanceState, event: FinanceEvent): FinanceState => {
  // Ensure defaults for safety
  const currentXp = state.xp || 0;
  const currentHistory = state.missionHistory || [];
  const currentSavings = state.savingsBalance || 0;
  const currentEmergency = state.emergencyFundBalance || 0;
  const currentGoals = state.goals || [];
  const currentLastWithdrawal = state.lastWithdrawalForSpending;

  switch (event.type) {
    case 'ADD_TRANSACTION':
      let addState = { ...state, missionHistory: currentHistory, goals: currentGoals, lastWithdrawalForSpending: currentLastWithdrawal };
      if (event.payload.type === 'income') {
        addState.incomes = [...state.incomes, event.payload];
      } else {
        // Handle expenses, potentially debiting from specific funds
        const expenseAmount = event.payload.amount;
        const sourceFundId = event.payload.sourceFundId;

        if (sourceFundId === 'emergency') {
            // Debit from emergency fund
            addState.emergencyFundBalance = Math.max(0, currentEmergency - expenseAmount);
        } else if (sourceFundId) {
            // Debit from a specific goal
            addState.goals = currentGoals.map(g => 
                g.id === sourceFundId ? { ...g, allocatedAmount: Math.max(0, g.allocatedAmount - expenseAmount) } : g
            );
        }
        // If no sourceFundId or not emergency/goal, it implicitly comes from availableBalance/liquidity

        addState.expenses = [...state.expenses, event.payload];
      }
      addState.xp = currentXp + 100;
      return addState;

    case 'DELETE_TRANSACTION':
      return { 
        ...state, 
        missionHistory: currentHistory,
        goals: currentGoals,
        incomes: event.payload.type === 'income' ? state.incomes.filter(t => t.id !== event.payload.id) : state.incomes,
        expenses: event.payload.type === 'expense' ? state.expenses.filter(t => t.id !== event.payload.id) : state.expenses,
        lastWithdrawalForSpending: currentLastWithdrawal,
      };

    case 'UPDATE_TRANSACTION':
      const cleanIncomes = state.incomes.filter(t => t.id !== event.payload.id);
      const cleanExpenses = state.expenses.filter(t => t.id !== event.payload.id);
      
      let updateState = { ...state, missionHistory: currentHistory, goals: currentGoals, lastWithdrawalForSpending: currentLastWithdrawal };
      if (event.payload.type === 'income') {
        updateState = { ...state, incomes: [...cleanIncomes, event.payload], expenses: cleanExpenses };
      } else {
        updateState = { ...state, incomes: cleanIncomes, expenses: [...cleanExpenses, event.payload] };
      }
      updateState.xp = currentXp + 20;
      return updateState;

    case 'MISSION_COMPLETED':
      return {
        ...state,
        missionHistory: [...currentHistory, { ...event.payload, status: 'completed' }],
        xp: currentXp + 150,
        lastWithdrawalForSpending: currentLastWithdrawal,
      };

    case 'MISSION_SKIPPED':
      return {
        ...state,
        missionHistory: [...currentHistory, { ...event.payload, status: 'skipped' }],
        lastWithdrawalForSpending: currentLastWithdrawal,
      };

    // --- BUCKET LOGIC ---
    case 'ALLOCATE_TO_SAVINGS':
      return {
        ...state,
        savingsBalance: currentSavings + event.payload.amount,
        xp: event.reversesEventId ? currentXp : currentXp + 50, // No XP for undoing/redoing
        lastWithdrawalForSpending: currentLastWithdrawal,
      };

    case 'WITHDRAW_FROM_SAVINGS':
      return {
        ...state,
        savingsBalance: Math.max(0, currentSavings - event.payload.amount),
        lastWithdrawalForSpending: currentLastWithdrawal,
      };

    case 'ALLOCATE_TO_EMERGENCY':
      return {
        ...state,
        emergencyFundBalance: currentEmergency + event.payload.amount,
        xp: event.reversesEventId ? currentXp : currentXp + 50,
        lastWithdrawalForSpending: currentLastWithdrawal,
      };

    case 'WITHDRAW_FROM_EMERGENCY':
      return {
        ...state,
        emergencyFundBalance: Math.max(0, currentEmergency - event.payload.amount),
        lastWithdrawalForSpending: currentLastWithdrawal,
      };

    // --- GOAL LOGIC ---
    case 'GOAL_CREATED':
      return {
        ...state,
        goals: [...currentGoals, { ...event.payload, allocatedAmount: 0, status: 'active' }],
        lastWithdrawalForSpending: currentLastWithdrawal,
      };

    case 'GOAL_UPDATED':
      return {
        ...state,
        goals: currentGoals.map(g => 
          g.id === event.payload.id 
            ? { ...g, name: event.payload.name || g.name, targetAmount: event.payload.targetAmount || g.targetAmount }
            : g
        ),
        lastWithdrawalForSpending: currentLastWithdrawal,
      };

    case 'GOAL_ARCHIVED':
      return {
        ...state,
        goals: currentGoals.map(g => g.id === event.payload.id ? { ...g, status: 'archived' } : g),
        lastWithdrawalForSpending: currentLastWithdrawal,
      };

    case 'ALLOCATE_SAVINGS_TO_GOAL':
      // Move from Savings -> Goal
      const amountToMove = Math.min(currentSavings, event.payload.amount);
      return {
        ...state,
        savingsBalance: currentSavings - amountToMove,
        goals: currentGoals.map(g => g.id === event.payload.goalId ? { ...g, allocatedAmount: g.allocatedAmount + amountToMove } : g),
        lastWithdrawalForSpending: currentLastWithdrawal,
      };

    case 'WITHDRAW_GOAL_TO_SAVINGS': {
      // Move from Goal -> Savings
      const goal = currentGoals.find(g => g.id === event.payload.goalId);
      if (!goal) return state;

      const safeAmount = Math.min(goal.allocatedAmount, event.payload.amount);
      
      return {
        ...state,
        savingsBalance: currentSavings + safeAmount,
        goals: currentGoals.map(g => {
            if (g.id !== event.payload.goalId) return g;
            return { ...g, allocatedAmount: g.allocatedAmount - safeAmount };
        }),
        lastWithdrawalForSpending: currentLastWithdrawal,
      };
    }

    case 'ALLOCATE_UNALLOCATED_TO_EMERGENCY': {
        const amount = event.payload.amount;
        // Ensure no negative balance for savings
        const newSavingsBalance = Math.max(0, currentSavings - amount);
        return {
            ...state,
            savingsBalance: newSavingsBalance,
            emergencyFundBalance: currentEmergency + amount,
            xp: event.reversesEventId ? currentXp : currentXp + 50, // XP for successful allocation
            lastWithdrawalForSpending: currentLastWithdrawal,
        };
    }

    case 'UNDO_ALLOCATE_UNALLOCATED_TO_EMERGENCY': {
        const amount = event.payload.amount;
        // Move money back from Emergency to Savings
        const newEmergencyBalance = Math.max(0, currentEmergency - amount);
        return {
            ...state,
            savingsBalance: currentSavings + amount, // Add back to savings
            emergencyFundBalance: newEmergencyBalance,
            xp: currentXp - 50, // Remove XP for undoing
            lastWithdrawalForSpending: currentLastWithdrawal,
        };
    }

    // --- NEW: WITHDRAW FOR SPENDING FLOW EVENTS ---
    case 'INITIATE_SPENDING_WITHDRAWAL':
      return {
        ...state,
        // The actual money movement is done by underlying events (WITHDRAW_FROM_EMERGENCY, etc.)
        // This event primarily sets the flag for the UI prompt.
        lastWithdrawalForSpending: {
          initialAmount: event.payload.amount,
          sourceFundId: event.payload.sourceFundId,
          timestamp: event.timestamp,
        },
      };

    case 'RETURN_SPENDING_WITHDRAWAL':
      return {
        ...state,
        // The actual money movement is done by underlying events (ALLOCATE_TO_EMERGENCY, etc.)
        lastWithdrawalForSpending: null, // Clear the flag after return
      };

    default:
      return state;
  }
};

export const reduceEvents = (events: FinanceEvent[]): FinanceState => {
  return events.reduce(applyEvent, initialState);
};