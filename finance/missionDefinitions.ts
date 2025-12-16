import { FinanceState } from './events';
import { FinanceSnapshot } from './selectors';
import { SheetView } from './storage';

// UI Types
export type MissionIconType = 'refresh' | 'database' | 'shield-alert' | 'zap' | 'target' | 'sparkles' | 'check-circle' | 'lock';
export type MissionColor = 'indigo' | 'green' | 'rose' | 'amber' | 'slate';
export type MissionType = 're-engagement' | 'onboarding' | 'threat' | 'maintenance' | 'growth' | 'status' | 'fallback';

// The object consumed by UI
export interface Mission {
  id: string;
  triggerKey: string;
  type: MissionType;
  title: string;
  desc: string;
  iconName: MissionIconType;
  color: MissionColor;
  actionLabel: string;
  actionView: SheetView | null;
  actionPath?: string;
  showArrow?: boolean; // NEW: Controls whether to show the ArrowRight icon
}

// PRIORITY TIERS: Lower number = Higher priority
// 0-10: Critical / Emergency
// 10-20: Setup / Onboarding
// 20-30: Maintenance (Daily)
// 30-40: Optimization / Allocation
// 99: Fallback (Relax)
// 1000: Absolute Fallback (No Missions Found)
export const PRIORITY_TIERS = {
  CRITICAL: 1,
  THREAT: 5,
  ONBOARDING: 10,
  MAINTENANCE: 20,
  ALLOCATION: 30,
  GROWTH: 40,
  STATUS_REPORT: 900, // For system_stable
  NO_MISSIONS_FOUND: 1000, // Absolute last resort
} as const;

// The contract for defining mission logic
export interface MissionDefinition {
  id: string;
  type: MissionType;
  priority: number; 
  cooldownHours?: number; // Optional: How many hours to suppress if skipped
  successMessage?: string | ((snapshot: FinanceSnapshot) => string);
  
  // If returns null, mission is not applicable. 
  // If returns string, that string is the unique key for THIS instance of the mission.
  triggerKeyBuilder: (state: FinanceState, snapshot: FinanceSnapshot, daysOffline: number) => string | null;
  content: (triggerKey: string, state: FinanceState, snapshot: FinanceSnapshot) => Omit<Mission, 'id' | 'triggerKey' | 'type'>;
}

// --- MISSION REGISTRY ---
export const MISSION_DEFINITIONS: MissionDefinition[] = [
  // 1. RE-ENGAGEMENT (Offline > 2 days)
  {
    id: 'check_balances',
    type: 're-engagement',
    priority: PRIORITY_TIERS.CRITICAL,
    successMessage: "Welcome back. Numbers verified.",
    triggerKeyBuilder: (state, snapshot, daysOffline) => {
      return daysOffline >= 2 ? `offline_${daysOffline}_days` : null;
    },
    content: () => ({
      title: "Verify Reality",
      desc: "It's been a few days. Open your banking app and ensure your Capital Hero balances match reality.",
      iconName: 'refresh',
      color: 'indigo',
      actionLabel: "Open Money Menu",
      actionView: 'menu',
      showArrow: true, // Explicitly show arrow
    })
  },

  // 2. ONBOARDING: ADD INCOME (No income recorded)
  {
    id: 'add_income',
    type: 'onboarding',
    priority: PRIORITY_TIERS.ONBOARDING,
    successMessage: "Foundation set. Now we have resources to work with.",
    triggerKeyBuilder: (state) => {
      return state.incomes.length === 0 ? 'setup_income' : null;
    },
    content: () => ({
      title: "Log Main Income",
      desc: "We can't plan without fuel. Add your primary salary or income source to start.",
      iconName: 'database',
      color: 'green',
      actionLabel: "Add Income",
      actionView: 'income',
      showArrow: true, // Explicitly show arrow
    })
  },

  // 3. THREAT: BILL DUE SOON (Within 7 days)
  {
    id: 'cover_threat',
    type: 'threat',
    priority: PRIORITY_TIERS.THREAT,
    successMessage: "Crisis averted. Bill marked as covered.",
    triggerKeyBuilder: (state, snapshot) => {
      // Find the most urgent threat
      if (snapshot.nextThreat && snapshot.nextThreat.daysUntil <= 7) {
        // Unique key combines bill name and due date. 
        // If they pay it (or we skip it), this key won't regenerate until next month's date.
        return `pay_${snapshot.nextThreat.name.replace(/\s+/g, '_')}_${snapshot.nextThreat.date}`;
      }
      return null;
    },
    content: (key, state, snapshot) => ({
      title: `Upcoming: ${snapshot.nextThreat?.name}`,
      desc: `This bill ($${snapshot.nextThreat?.amount}) is due in ${snapshot.nextThreat?.daysUntil === 0 ? 'hours' : snapshot.nextThreat?.daysUntil + ' days'}. Ensure you have the cash.`,
      iconName: 'shield-alert',
      color: 'amber',
      actionLabel: "Manage Bills",
      actionView: 'regular', // Opens regular view to potentially mark/edit, or just menu
      showArrow: true, // Explicitly show arrow
    })
  },

  // 4. ONBOARDING: ADD RECURRING (No expenses recorded)
  {
    id: 'add_recurring',
    type: 'onboarding',
    priority: PRIORITY_TIERS.ONBOARDING + 1,
    successMessage: "Commitment logged. I'll help you track it.",
    triggerKeyBuilder: (state) => {
      const hasBills = state.expenses.some(t => t.recurring);
      return !hasBills ? 'setup_recurring' : null;
    },
    content: () => ({
      title: "Add a Fixed Expense",
      desc: "Rent, Netflix, Loan... Add one recurring bill so I can calculate your survival costs.",
      iconName: 'target',
      color: 'rose',
      actionLabel: "Add Bill",
      actionView: 'regular',
      showArrow: true, // Explicitly show arrow
    })
  },

  // 5. MAINTENANCE: DAILY CHECK-IN (No activity today)
  {
    id: 'daily_checkin',
    type: 'maintenance',
    priority: PRIORITY_TIERS.MAINTENANCE,
    successMessage: "Day logged. Consistency is key.",
    triggerKeyBuilder: (state, snapshot) => {
      const today = new Date().toISOString().split('T')[0];
      // Check if ANY event happened today (transaction or mission complete)
      // We look at the last event to see if it was today.
      // Actually, better: Check if any transaction has today's date.
      const hasTxToday = state.incomes.some(t => t.date.startsWith(today)) || 
                         state.expenses.some(t => t.date.startsWith(today));
      
      // Also check mission history to ensure we don't spam the checkin if they just did it
      const checkedInToday = state.missionHistory.some(h => 
        h.missionId === 'daily_checkin' && 
        new Date(h.timestamp).toISOString().startsWith(today)
      );

      if (!hasTxToday && !checkedInToday) {
        return `checkin_${today}`;
      }
      return null;
    },
    content: () => ({
      title: "Daily Log",
      desc: "No activity recorded today. Did you spend money? If not, confirm 'No Spend' by skipping or logging $0.",
      iconName: 'check-circle',
      color: 'indigo',
      actionLabel: "Log Activity",
      actionView: 'menu',
      showArrow: true, // Explicitly show arrow
    })
  },

  // 6. ALLOCATION: ASSIGN SURPLUS (Unallocated > 10)
  // This is the "Chain" mission. If user adds income, this immediately triggers.
  {
    id: 'assign_surplus',
    type: 'growth',
    priority: PRIORITY_TIERS.ALLOCATION,
    successMessage: "Money given a job. That's how wealth is built.",
    triggerKeyBuilder: (state, snapshot) => {
      // Trigger if we have more than $10 unallocated
      if (snapshot.unallocatedSavings > 10) {
        // The key includes the amount, so if they move some money, the amount changes -> new mission triggers
        return `assign_${Math.floor(snapshot.unallocatedSavings)}`; 
      }
      return null;
    },
    content: (key, state, snapshot) => ({
      title: "Give Every Dollar a Job",
      desc: `You have $${snapshot.unallocatedSavings.toLocaleString()} sitting in Unallocated Cash. Move it to a Goal or Emergency Fund.`,
      iconName: 'zap',
      color: 'indigo',
      actionLabel: "Allocate Cash", // Changed label to be more specific
      actionPath: '/progress', // Now directs to Progress page
      actionView: null, // No longer opens MoneySheet directly
      showArrow: true, // Explicitly show arrow
    })
  },

  // 7. GROWTH: START EMERGENCY FUND (If empty and surplus exists)
  {
    id: 'start_emergency',
    type: 'growth',
    priority: PRIORITY_TIERS.GROWTH,
    successMessage: "Safety net initiated.",
    triggerKeyBuilder: (state, snapshot) => {
      if (snapshot.emergencyFund === 0 && snapshot.unallocatedSavings > 0) {
        return 'init_emergency';
      }
      return null;
    },
    content: () => ({
      title: "Start Emergency Fund",
      desc: "Your safety net is empty. Allocate even $1 to start building your protection.",
      iconName: 'shield-alert',
      color: 'amber',
      actionLabel: "Fund Safety Net",
      actionPath: '/progress', // Directs to Progress page
      actionView: null, // No longer opens MoneySheet directly
      showArrow: true, // Explicitly show arrow
    })
  },

  // FALLBACK 1: SYSTEM STABLE / NO IMMEDIATE ACTIONS
  // This mission will show if no higher priority missions are active.
  {
    id: 'system_stable',
    type: 'status',
    priority: PRIORITY_TIERS.STATUS_REPORT,
    cooldownHours: 2, // Can be skipped for 2 hours
    triggerKeyBuilder: (state) => {
      // Only show if user has at least some income data
      if (state.incomes.length > 0) {
        return 'system_stable_present';
      }
      return null;
    },
    content: () => ({
      title: "All Systems Operational",
      desc: "You are up to date. No immediate risks detected. You remain in control.",
      iconName: 'lock',
      color: 'slate',
      actionLabel: "View Control Panel",
      actionPath: '/progress',
      actionView: null,
      showArrow: true, // Explicitly show arrow
    })
  },

  // FALLBACK 2: ABSOLUTE LAST RESORT - NO MISSIONS TO SHOW
  // This mission will only show if all other missions (including system_stable)
  // are either not applicable or are on cooldown. This one cannot be skipped/completed.
  {
    id: 'no_missions_yet',
    type: 'fallback',
    priority: PRIORITY_TIERS.NO_MISSIONS_FOUND,
    triggerKeyBuilder: () => 'no_missions_available', // Always available if nothing else triggers
    content: () => ({
      title: "Nothing for you right now.",
      desc: "All tasks are complete or on cooldown. Enjoy this quiet moment, or check back later!",
      iconName: 'sparkles',
      color: 'slate',
      actionLabel: "Take a break", // Non-functional button
      actionPath: '/', // Just go to home
      actionView: null,
      showArrow: false, // NEW: Do NOT show arrow for "Take a break"
    })
  }
];

// Removed RELAX_MISSION constant as it's now part of MISSION_DEFINITIONS
// export const RELAX_MISSION: Mission = { ... };