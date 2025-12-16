import { FinanceEvent } from './events';
import { FinanceSnapshot } from './selectors';
import { MISSION_DEFINITIONS } from './missionDefinitions';

export const getMissionImpact = (
  event: FinanceEvent,
  prev: FinanceSnapshot,
  curr: FinanceSnapshot
): string => {
  // 1. Transactions: Structural Impact
  if (event.type === 'ADD_TRANSACTION') {
    const tx = event.payload;

    if (tx.type === 'income') {
        const diff = curr.runwayDays - prev.runwayDays;
        if (curr.runwayDays >= 9999 && prev.runwayDays < 9999) {
            return "Breathing Room: You're earning more than you spend.";
        }
        if (diff > 0 && curr.runwayDays < 9999) {
            return `Safety Extended: That bought you ${diff} more days of stability.`;
        }
        return "Good. Having resources gives you options.";
    }

    if (tx.type === 'expense') {
        if (tx.recurring) {
            return "Noted. I'll remind you when this is due.";
        }
        if (tx.category === 'Toxic') {
            const diff = prev.runwayDays - curr.runwayDays;
            if (diff > 0 && curr.runwayDays < 9999) {
                return `Reality Check: That cost you ${diff} days of freedom.`;
            }
            return "Impulse Logged. Better to face it than hide it.";
        }
        
        // New: Specific messages for debits from funds
        if (tx.sourceFundId === 'emergency') {
            return `Expense from Emergency Fund: Logged.`;
        } else if (tx.sourceFundId) {
            const goal = curr.goals.find(g => g.id === tx.sourceFundId);
            const name = goal ? goal.name : 'a Goal';
            return `Expense from ${name}: Logged.`;
        }

        return "Logged. Keeping the record straight.";
    }
  }

  // 1b. Goal & Bucket Impact
  if (event.type === 'ALLOCATE_SAVINGS_TO_GOAL') {
      const goal = curr.goals.find(g => g.id === event.payload.goalId);
      const name = goal ? goal.name : 'Goal';
      return `Added $${event.payload.amount} to ${name}`;
  }

  if (event.type === 'WITHDRAW_GOAL_TO_SAVINGS') {
      const goal = curr.goals.find(g => g.id === event.payload.goalId);
      const name = goal ? goal.name : 'Goal';
      return `Withdrew $${event.payload.amount} from ${name}`;
  }

  if (event.type === 'ALLOCATE_TO_SAVINGS') return `Saved $${event.payload.amount} to Unallocated Cash`;
  if (event.type === 'WITHDRAW_FROM_SAVINGS') return `Withdrew $${event.payload.amount} from Savings`;
  if (event.type === 'ALLOCATE_TO_EMERGENCY') return `Added $${event.payload.amount} to Emergency Fund`;
  if (event.type === 'WITHDRAW_FROM_EMERGENCY') return `Used $${event.payload.amount} from Emergency Fund`;
  if (event.type === 'ALLOCATE_UNALLOCATED_TO_EMERGENCY') return `Added $${event.payload.amount} to Emergency Fund from Unallocated Cash`;

  // NEW: WITHDRAW FOR SPENDING FLOW EVENTS
  if (event.type === 'INITIATE_SPENDING_WITHDRAWAL') {
      const sourceName = event.payload.sourceFundId === 'emergency' 
        ? 'Emergency Fund' 
        : (curr.goals.find(g => g.id === event.payload.sourceFundId)?.name || 'a Goal');
      return `Funds released: $${event.payload.amount} from ${sourceName}. Spend wisely.`;
  }
  if (event.type === 'RETURN_SPENDING_WITHDRAWAL') {
      const sourceName = event.payload.sourceFundId === 'emergency' 
        ? 'Emergency Fund' 
        : (curr.goals.find(g => g.id === event.payload.sourceFundId)?.name || 'a Goal');
      return `Unused cash returned: $${event.payload.amount} to ${sourceName}.`;
  }

  // 2. Missions: Narrative Impact
  if (event.type === 'MISSION_COMPLETED') {
      const def = MISSION_DEFINITIONS.find(m => m.id === event.payload.missionId);
      if (def?.successMessage) {
          return typeof def.successMessage === 'function' 
            ? def.successMessage(curr) 
            : def.successMessage;
      }
      
      // Default Fallbacks
      return "Step complete. You're moving forward.";
  }

  // 3. Skipped: Neutral acknowledgment
  if (event.type === 'MISSION_SKIPPED') {
      return "No problem. We'll handle that later.";
  }

  return "Action logged.";
};