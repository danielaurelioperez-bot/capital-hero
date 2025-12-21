import React, { createContext, useState, useEffect, useMemo, useRef, ReactNode } from 'react';
import { 
  Transaction, 
  TransactionType,
  loadEvents,
  saveEvents,
  SheetView,
  TransactionDraft,
  Goal
  Goal,
  TransactionDraft
} from './storage';
import { FinanceEvent, reduceEvents } from './events';
import { computeStatus, ComputedStatus } from './computeStatus';
import {
  getFinanceSnapshot,
  getProgressInsights,
  selectNextSteps,
  type FinanceSnapshot,
  type ProgressInsights,
  type NextStep,
} from './selectors';
import { Mission, getActiveMission, getNextMissions } from './missions';
import { getMissionImpact } from './impact';

const DRAFTS_KEY = 'ch_pending_drafts';

interface FinanceContextType {
  incomes: Transaction[];
  expenses: Transaction[];
  addTransaction: (t: Omit<Transaction, 'id'>) => void;
  deleteTransaction: (id: string, type: TransactionType) => void;
  editTransaction: (t: Transaction) => void;
  summary: ComputedStatus;
  snapshot: FinanceSnapshot;
  insights: ProgressInsights;
  nextSteps: NextStep[];
  xp: number;
  level: number;
  nextLevelXp: number;
  recentAction: boolean;
  lastEvent: FinanceEvent | null;
  daysOffline: number;
  impactMsg: string | null;
  
  // Mission Control
  activeMission: Mission; 
  availableMissions: Mission[]; 
  completeMission: (mission: Mission) => void;
  skipMission: (mission: Mission) => void;

  // Bucket Actions
  moveToSavings: (amount: number) => void;
  withdrawFromSavings: (amount: number) => void;
  moveToEmergency: (amount: number) => void;
  withdrawFromEmergency: (amount: number) => void;
  allocateUnallocatedToEmergency: (amount: number) => boolean; // NEW: Unallocated -> Emergency
  
  // Goal Actions
  createGoal: (name: string, targetAmount: number) => void;
  updateGoal: (id: string, name: string, targetAmount: number) => void;
  archiveGoal: (id: string) => void;
  allocateToGoal: (goalId: string, amount: number) => boolean; // Returns success status
  withdrawFromGoal: (goalId: string, amount: number) => boolean; // Returns success status
  
  // Undo
  undoLastAction: () => void;
  canUndo: boolean;

  // UI Control
  isSheetOpen: boolean;
  sheetView: SheetView;
  sheetPayload: any;
  openSheet: (view?: SheetView, payload?: any) => void;
  closeSheet: () => void;
  draft: TransactionDraft | null;
  addDraft: (draft: TransactionDraft) => void;
  clearDraft: () => void;

  // NEW: Withdraw for Spending Workflow
  lastWithdrawalForSpending: { initialAmount: number; sourceFundId: string; timestamp: number } | null;
  initiateWithdrawalForSpending: (sourceFundId: string, amount: number) => boolean;
  returnUnusedCash: (amountToReturn: number) => boolean;

  // Transaction Drafts
  pendingTransactions: TransactionDraft[];
  addDraft: (draft: TransactionDraft) => void;
  confirmDraft: (id: string) => void;
  editDraft: (id: string, partial: Partial<TransactionDraft>) => void;
  discardDraft: (id: string) => void;
}

export const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

export const FinanceProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [events, setEvents] = useState<FinanceEvent[]>([]);
  const [recentAction, setRecentAction] = useState(false);
  const [daysOffline, setDaysOffline] = useState(0);
  const [impactMsg, setImpactMsg] = useState<string | null>(null);
  const [pendingTransactions, setPendingTransactions] = useState<TransactionDraft[]>([]);

  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [sheetView, setSheetView] = useState<SheetView>('menu');
  const [sheetPayload, setSheetPayload] = useState<any>(null);
  const [draft, setDraft] = useState<TransactionDraft | null>(null);

  useEffect(() => {
    const loadedEvents = loadEvents();
    // Backward compatibility: If loaded events don't have id/timestamp, we might need to patch them (optional for MVP)
    setEvents(loadedEvents);

    const now = Date.now();
    const lastVisit = localStorage.getItem('ch_last_visit');
    
    if (lastVisit) {
      const lastVisitTime = parseInt(lastVisit, 10);
      const diffTime = Math.abs(now - lastVisitTime);
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      setDaysOffline(diffDays);
    }

    localStorage.setItem('ch_last_visit', now.toString());
  }, []);

  useEffect(() => {
    try {
      const storedDrafts = localStorage.getItem(DRAFTS_KEY);
      if (storedDrafts) {
        const parsed: TransactionDraft[] = JSON.parse(storedDrafts);
        setPendingTransactions(parsed);
      }
    } catch (error) {
      console.error('Error loading drafts', error);
    }
  }, []);

  const state = useMemo(() => reduceEvents(events), [events]);
  const { incomes, expenses, xp, lastWithdrawalForSpending } = state;

  const lastEvent = events.length > 0 ? events[events.length - 1] : null;
  
  // Determine if last action is undoable
  const canUndo = useMemo(() => {
      if (!lastEvent) return false;
      const undoableTypes = [
          'ALLOCATE_TO_SAVINGS', 'WITHDRAW_FROM_SAVINGS',
          'ALLOCATE_TO_EMERGENCY', 'WITHDRAW_FROM_EMERGENCY',
          'ALLOCATE_SAVINGS_TO_GOAL', 'WITHDRAW_GOAL_TO_SAVINGS',
          'ALLOCATE_UNALLOCATED_TO_EMERGENCY',
          // New composite events are not directly undoable as single events
          // Their internal sub-events are what would be undone.
          // For now, these specific composite actions won't be undoable via a single button.
          // This requires a more complex "undo composite action" logic.
          // The individual 'WITHDRAW_FROM_EMERGENCY' etc. ARE undoable.
      ];
      return undoableTypes.includes(lastEvent.type) && !lastEvent.reversesEventId;
  }, [lastEvent]);

  const level = Math.floor(xp / 1000) + 1;
  const nextLevelXp = level * 1000;

  const summary = useMemo(() => computeStatus(state, daysOffline), [state, daysOffline]);
  const snapshot = useMemo(() => getFinanceSnapshot(state), [state]);
  const insights = useMemo(() => getProgressInsights(state), [state]);

  const nextSteps = useMemo(() => selectNextSteps(state, summary, 5), [state, summary]);

  useEffect(() => {
    try {
      localStorage.setItem(DRAFTS_KEY, JSON.stringify(pendingTransactions));
    } catch (error) {
      console.error('Error saving drafts', error);
    }
  }, [pendingTransactions]);

  const activeMission = useMemo(() => 
    getActiveMission(state, daysOffline, snapshot), 
    [state, daysOffline, snapshot]
  );
  
  const availableMissions = useMemo(() => 
    getNextMissions(state, daysOffline, snapshot, 3), 
    [state, daysOffline, snapshot]
  );

  const prevSnapshotRef = useRef<FinanceSnapshot | null>(null);

  useEffect(() => {
    if (recentAction && prevSnapshotRef.current && lastEvent) {
      const prev = prevSnapshotRef.current;
      const curr = snapshot;
      
      const msg = getMissionImpact(lastEvent, prev, curr);
      setImpactMsg(msg);
    }
    prevSnapshotRef.current = snapshot;
  }, [snapshot, recentAction, lastEvent]);

  const dispatch = (action: Omit<FinanceEvent, 'id' | 'timestamp'>) => {
    const newEvent = {
        ...action,
        id: crypto.randomUUID(),
        timestamp: Date.now()
    } as FinanceEvent;

    const updatedLog = [...events, newEvent];
    setEvents(updatedLog);
    saveEvents(updatedLog);
    
    setRecentAction(true);
    setTimeout(() => {
      setRecentAction(false);
      setImpactMsg(null); 
    }, 2500); 
    
    setDaysOffline(0); 
  };

  const undoLastAction = () => {
      if (!lastEvent || !canUndo) return;

      let inverseAction: Omit<FinanceEvent, 'id' | 'timestamp'> | null = null;
      const { type, payload } = lastEvent;

      if (type === 'ALLOCATE_TO_SAVINGS') {
          inverseAction = { type: 'WITHDRAW_FROM_SAVINGS', payload, reversesEventId: lastEvent.id };
      } else if (type === 'WITHDRAW_FROM_SAVINGS') {
          inverseAction = { type: 'ALLOCATE_TO_SAVINGS', payload, reversesEventId: lastEvent.id };
      } else if (type === 'ALLOCATE_TO_EMERGENCY') {
          inverseAction = { type: 'WITHDRAW_FROM_EMERGENCY', payload, reversesEventId: lastEvent.id };
      } else if (type === 'WITHDRAW_FROM_EMERGENCY') {
          inverseAction = { type: 'ALLOCATE_TO_EMERGENCY', payload, reversesEventId: lastEvent.id };
      } else if (type === 'ALLOCATE_SAVINGS_TO_GOAL') {
          inverseAction = { type: 'WITHDRAW_GOAL_TO_SAVINGS', payload, reversesEventId: lastEvent.id };
      } else if (type === 'WITHDRAW_GOAL_TO_SAVINGS') {
          inverseAction = { type: 'ALLOCATE_SAVINGS_TO_GOAL', payload, reversesEventId: lastEvent.id };
      } else if (type === 'ALLOCATE_UNALLOCATED_TO_EMERGENCY') {
          inverseAction = { type: 'UNDO_ALLOCATE_UNALLOCATED_TO_EMERGENCY', payload, reversesEventId: lastEvent.id };
      }
      // Note: INITIATE_SPENDING_WITHDRAWAL and RETURN_SPENDING_WITHDRAWAL are composite actions
      // and their undo logic would involve reversing multiple internal events, which is
      // beyond the scope of this simple `canUndo` / `undoLastAction` for now.
      // Individual money movement events that comprise them ARE undoable if they are the very last event.

      if (inverseAction) {
          dispatch(inverseAction);
      }
  };

  const addTransaction = (t: Omit<Transaction, 'id'>) => {
    const newTx = { ...t, id: crypto.randomUUID() };
    dispatch({ 
      type: 'ADD_TRANSACTION', 
      payload: newTx 
    });
  };

  const deleteTransaction = (id: string, type: TransactionType) => {
    dispatch({ 
      type: 'DELETE_TRANSACTION', 
      payload: { id, type } 
    });
  };

  const editTransaction = (t: Transaction) => {
    dispatch({
      type: 'UPDATE_TRANSACTION',
      payload: t
    });
  };

  const completeMission = (mission: Mission) => {
    dispatch({
      type: 'MISSION_COMPLETED',
      payload: {
        missionId: mission.id,
        triggerKey: mission.triggerKey,
        timestamp: Date.now()
      }
    });
  };

  const skipMission = (mission: Mission) => {
    dispatch({
      type: 'MISSION_SKIPPED',
      payload: {
        missionId: mission.id,
        triggerKey: mission.triggerKey,
        timestamp: Date.now()
      }
    });
  };

  // --- BUCKET ACTIONS (HARDENED) ---

  const moveToSavings = (amount: number) => {
    if (amount <= 0) return;
    if (amount > snapshot.availableBalance) {
      console.warn(`Blocked invalid move: ${amount} > ${snapshot.availableBalance}`);
      return; 
    }
    dispatch({ type: 'ALLOCATE_TO_SAVINGS', payload: { amount } });
  };

  const withdrawFromSavings = (amount: number) => {
    if (amount <= 0) return;
    if (amount > snapshot.unallocatedSavings) {
      console.warn("Blocked withdrawal > savings balance");
      return;
    }
    dispatch({ type: 'WITHDRAW_FROM_SAVINGS', payload: { amount } });
  };

  const moveToEmergency = (amount: number) => {
    if (amount <= 0) return;
    if (amount > snapshot.availableBalance) {
      console.warn("Blocked move > available balance");
      return;
    }
    dispatch({ type: 'ALLOCATE_TO_EMERGENCY', payload: { amount } });
  };

  const withdrawFromEmergency = (amount: number) => {
    if (amount <= 0) return;
    if (amount > snapshot.emergencyFund) {
      console.warn("Blocked withdrawal > emergency fund");
      return;
    }
    dispatch({ type: 'WITHDRAW_FROM_EMERGENCY', payload: { amount } });
  };

  const allocateUnallocatedToEmergency = (amount: number): boolean => {
      if (amount <= 0) {
          console.warn("Blocked allocation: amount must be positive.");
          return false;
      }
      if (amount > snapshot.unallocatedSavings) {
          console.warn("Blocked allocation: not enough unallocated savings.");
          return false;
      }
      // Dispatch a single composite event for this specific transfer
      dispatch({ 
          type: 'ALLOCATE_UNALLOCATED_TO_EMERGENCY', 
          payload: { amount } 
      });
      return true;
  };

  // --- GOAL ACTIONS (HARDENED) ---
  
  const createGoal = (name: string, targetAmount: number) => {
      dispatch({ 
          type: 'GOAL_CREATED', 
          payload: { id: crypto.randomUUID(), name, targetAmount } 
      });
  };

  const updateGoal = (id: string, name: string, targetAmount: number) => {
      dispatch({
          type: 'GOAL_UPDATED',
          payload: { id, name, targetAmount }
      });
  };

  const archiveGoal = (id: string) => {
      dispatch({
          type: 'GOAL_ARCHIVED',
          payload: { id }
      });
  };

  const allocateToGoal = (goalId: string, amount: number): boolean => {
      if (amount <= 0) return false;
      if (amount > snapshot.unallocatedSavings) {
          console.warn("Blocked allocation > unallocated savings");
          return false;
      }
      dispatch({
          type: 'ALLOCATE_SAVINGS_TO_GOAL',
          payload: { goalId, amount }
      });
      return true;
  };

  const withdrawFromGoal = (goalId: string, amount: number): boolean => {
      if (amount <= 0) return false;
      const goal = snapshot.goals.find(g => g.id === goalId);
      if (!goal || amount > goal.allocatedAmount) {
         console.warn("Blocked withdrawal > goal balance");
         return false;
      }

      dispatch({
          type: 'WITHDRAW_GOAL_TO_SAVINGS',
          payload: { goalId, amount }
      });
      return true;
  };

  // --- TRANSACTION DRAFTS ---

  const addDraft = (draft: TransactionDraft) => {
    const draftId = draft.id || crypto.randomUUID();
    const normalizedDraft = { ...draft, id: draftId } as TransactionDraft;
    setPendingTransactions(prev => {
      const existing = prev.filter(d => d.id !== draftId);
      return [...existing, normalizedDraft];
    });
  };

  const editDraft = (id: string, partial: Partial<TransactionDraft>) => {
    setPendingTransactions(prev => prev.map(d => (d.id === id ? { ...d, ...partial } : d)));
  };

  const discardDraft = (id: string) => {
    setPendingTransactions(prev => prev.filter(d => d.id !== id));
  };

  const mapDraftToTransaction = (draft: TransactionDraft): Omit<Transaction, 'id'> | null => {
    if (!draft.amount || draft.amount <= 0) return null;
    const fallbackCategory = draft.type === 'income' ? 'Other' : 'Non-essentials';

    return {
      amount: draft.amount,
      type: draft.type,
      category: (draft.category as any) ?? fallbackCategory,
      note: draft.notes ?? draft.merchant ?? 'Draft transaction',
      date: draft.date ?? new Date().toISOString(),
      recurring: false,
    };
  };

  const confirmDraft = (id: string) => {
    const draft = pendingTransactions.find(d => d.id === id);
    if (!draft) return;

    const transaction = mapDraftToTransaction(draft);
    if (!transaction) return;

    addTransaction(transaction);
    setPendingTransactions(prev => prev.filter(d => d.id !== id));
  };

  // --- NEW: Withdraw for Spending Workflow Actions ---

  const initiateWithdrawalForSpending = (sourceFundId: string, amount: number): boolean => {
    if (amount <= 0) {
      console.warn("Blocked withdrawal: Amount must be positive.");
      return false;
    }

    let success = false;
    if (sourceFundId === 'emergency') {
      if (amount > snapshot.emergencyFund) {
        console.warn("Blocked withdrawal: Not enough in Emergency Fund.");
        return false;
      }
      dispatch({ type: 'WITHDRAW_FROM_EMERGENCY', payload: { amount } });
      success = true;
    } else { // Assume it's a Goal ID
      const goal = snapshot.goals.find(g => g.id === sourceFundId);
      if (!goal || amount > goal.allocatedAmount) {
        console.warn(`Blocked withdrawal: Not enough in goal ${sourceFundId}.`);
        return false;
      }
      dispatch({ type: 'WITHDRAW_GOAL_TO_SAVINGS', payload: { goalId: sourceFundId, amount } });
      // Now move from unallocated savings to available balance (this is critical for this flow)
      // Note: The `withdrawFromSavings` check for `snapshot.unallocatedSavings` might fail if `WITHDRAW_GOAL_TO_SAVINGS` hasn't fully propagated.
      // A more robust solution might involve dispatching a composite event or waiting for state update.
      // For now, assume dispatch order handles this quickly enough.
      dispatch({ type: 'WITHDRAW_FROM_SAVINGS', payload: { amount } }); 
      success = true;
    }

    if (success) {
      dispatch({ type: 'INITIATE_SPENDING_WITHDRAWAL', payload: { amount, sourceFundId } });
    }
    return success;
  };

  const returnUnusedCash = (amountToReturn: number): boolean => {
    if (!lastWithdrawalForSpending || amountToReturn <= 0 || amountToReturn > snapshot.availableBalance) {
      console.warn("Blocked return: Invalid amount or no active withdrawal to return to.");
      return false;
    }

    let success = false;
    const { sourceFundId } = lastWithdrawalForSpending;

    if (sourceFundId === 'emergency') {
      dispatch({ type: 'ALLOCATE_TO_EMERGENCY', payload: { amount: amountToReturn } });
      success = true;
    } else { // Assume it's a Goal ID
      dispatch({ type: 'ALLOCATE_TO_SAVINGS', payload: { amount: amountToReturn } });
      // Now move from unallocated savings to the goal
      dispatch({ type: 'ALLOCATE_SAVINGS_TO_GOAL', payload: { goalId: sourceFundId, amount: amountToReturn } });
      success = true;
    }

    if (success) {
      dispatch({ type: 'RETURN_SPENDING_WITHDRAWAL', payload: { amount: amountToReturn, sourceFundId } });
    }
    return success;
  };

  const openSheet = (view: SheetView = 'menu', payload?: any) => {
    setIsSheetOpen(true); // Open first to ensure it's rendered for animation
    setSheetPayload(payload ?? null);
    setTimeout(() => setSheetView(view), 50); // Small delay to allow initial render before setting view
  };

  const closeSheet = () => {
    setIsSheetOpen(false);
  };

  const addDraft = (draftInput: TransactionDraft) => {
    setDraft(draftInput);
  };

  const clearDraft = () => {
    setDraft(null);
  };

  return (
    <FinanceContext.Provider value={{ 
      incomes, 
      expenses, 
      xp,
      level,
      nextLevelXp,
      addTransaction, 
      deleteTransaction, 
      editTransaction, 
      completeMission,
      skipMission,
      moveToSavings,
      withdrawFromSavings,
      moveToEmergency,
      withdrawFromEmergency,
      allocateUnallocatedToEmergency, // Expose new function
      createGoal,
      updateGoal,
      archiveGoal,
      allocateToGoal,
      withdrawFromGoal,
      undoLastAction,
      canUndo,
      activeMission,
      availableMissions,
      summary, 
      snapshot,
      insights,
      nextSteps,
      recentAction,
      lastEvent,
      daysOffline,
      impactMsg,
      isSheetOpen,
      sheetView,
      sheetPayload,
      openSheet,
      closeSheet,
      draft,
      addDraft,
      clearDraft,
      lastWithdrawalForSpending, // NEW
      initiateWithdrawalForSpending, // NEW
      returnUnusedCash, // NEW
      pendingTransactions,
      addDraft,
      confirmDraft,
      editDraft,
      discardDraft,
    }}>
      {children}
    </FinanceContext.Provider>
  );
};
