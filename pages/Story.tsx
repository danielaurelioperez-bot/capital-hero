import React from 'react';
import { Sparkles, Lock } from 'lucide-react';
import { useFinance } from '../hooks/useFinance';
import { CharacterPortrait } from '../components/PixelAvatars';
import { FinanceEvent } from '../finance/events'; // Import FinanceEvent for type checking
import { Transaction, Goal } from '../finance/storage'; // Import Transaction and Goal for explicit casting

const Story: React.FC = () => {
  const { summary, lastEvent, snapshot } = useFinance();

  // DIALOGUE ENGINE: Confrontation Logic
  // Vince (Antagonist): Charismatic, justifying, minimizes consequences ("You deserve it").
  // Ari (Ally): Calm, realistic, protective ("That costs you peace of mind").

  const getDialogues = () => {
    // 1. EVENT-BASED TRIGGERS (Specific Actions)
    if (lastEvent) {
        // Properties like 'amount' and 'goalId' are now extracted within specific case blocks
        // where their types are correctly narrowed, instead of generically upfront.

        switch (lastEvent.type) {
            case 'ADD_TRANSACTION':
                const txPayload = lastEvent.payload as Transaction; // Explicitly cast payload to Transaction
                const amountTx = txPayload.amount;

                // SCENARIO: Income (Reinforcements)
                if (txPayload.type === 'income') {
                    return [
                        { speaker: 'Villain', name: 'Vince', text: `Cha-ching! $${amountTx.toLocaleString()}! Let's splurge a little, you've earned it!`, align: 'right', color: 'rose' },
                        { speaker: 'Mentor', name: 'Ari', text: `Excellent. Now, let's give this $${amountTx.toLocaleString()} a purpose. Every dollar has a job.`, align: 'left', color: 'indigo' }
                    ];
                }

                // SCENARIO: Toxic/Impulse Spend
                if (txPayload.category === 'Toxic') {
                    return [
                        { speaker: 'Villain', name: 'Vince', text: `Come on, it's just one time. You've had a rough week, you deserve a break.`, align: 'right', color: 'rose' },
                        { speaker: 'Mentor', name: 'Ari', text: `The relief you feel is real, but it's temporary. That purchase just shortened your safety net by days.`, align: 'left', color: 'indigo' }
                    ];
                }

                // SCENARIO: Lifestyle Creep (Non-essentials)
                if (txPayload.category === 'Non-essentials') {
                    if (summary.status === 'In Trouble') {
                        return [
                            { speaker: 'Villain', name: 'Vince', text: `Don't stress about the numbers. Life is for living, right? Just swipe the card.`, align: 'right', color: 'rose' },
                            { speaker: 'Mentor', name: 'Ari', text: `Ignoring the red light doesn't stop the crash. We need to pause spending to get back to safety.`, align: 'left', color: 'indigo' }
                        ];
                    } else if (summary.status === 'At Risk') {
                        return [
                            { speaker: 'Villain', name: 'Vince', text: `It's not a lot, just a little treat. It won't hurt.`, align: 'right', color: 'rose' },
                            { speaker: 'Mentor', name: 'Ari', text: `Be mindful. Even small expenses add up and can tip the scales when things are tight.`, align: 'left', color: 'indigo' }
                        ];
                    } else { // Stable
                        return [
                            { speaker: 'Villain', name: 'Vince', text: `You're stable, go for it! Live a little!`, align: 'right', color: 'rose' },
                            { speaker: 'Mentor', name: 'Ari', text: `Mindful spending is key to maintaining this freedom. Enjoy it wisely.`, align: 'left', color: 'indigo' }
                        ];
                    }
                }

                // SCENARIO: Paying an Essential Bill (Responsibility)
                if (txPayload.category === 'Essentials' && txPayload.recurring) {
                    return [
                        { speaker: 'Villain', name: 'Vince', text: `Ugh, bills are so boring. Imagine the cool stuff we could've bought with that.`, align: 'right', color: 'rose' },
                        { speaker: 'Mentor', name: 'Ari', text: `Boring is what keeps the lights on. Paying this now means one less headache later.`, align: 'left', color: 'indigo' }
                    ];
                }

                // SCENARIO: Debt Payment
                if (txPayload.category === 'Debt') {
                    return [
                        { speaker: 'Villain', name: 'Vince', text: `Another payment bites the dust. That money could be for fun right now!`, align: 'right', color: 'rose' },
                        { speaker: 'Mentor', name: 'Ari', text: `Reducing debt is buying future freedom. It’s an investment in peace of mind.`, align: 'left', color: 'indigo' }
                    ];
                }
                break;
            
            case 'ALLOCATE_TO_SAVINGS':
                const allocateSavingsPayload = lastEvent.payload as { amount: number; note?: string };
                const amountAllocateSavings = allocateSavingsPayload.amount;
                return [
                    { speaker: 'Villain', name: 'Vince', text: `Stashing $${amountAllocateSavings.toLocaleString()} away? What a buzzkill!`, align: 'right', color: 'rose' },
                    { speaker: 'Mentor', name: 'Ari', text: `Giving your $${amountAllocateSavings.toLocaleString()} a clear purpose. Excellent.`, align: 'left', color: 'indigo' }
                ];

            case 'WITHDRAW_FROM_SAVINGS':
                const withdrawSavingsPayload = lastEvent.payload as { amount: number; note?: string };
                const amountWithdrawSavings = withdrawSavingsPayload.amount;
                return [
                    { speaker: 'Villain', name: 'Vince', text: `Freedom! $${amountWithdrawSavings.toLocaleString()} to spend! What are we getting?`, align: 'right', color: 'rose' },
                    { speaker: 'Mentor', name: 'Ari', text: `Why did we withdraw $${amountWithdrawSavings.toLocaleString()}? Every move has a reason. Let's make it a good one.`, align: 'left', color: 'indigo' }
                ];
            
            case 'ALLOCATE_TO_EMERGENCY':
                const allocateEmergencyPayload = lastEvent.payload as { amount: number; note?: string };
                const amountAllocateEmergency = allocateEmergencyPayload.amount;
                return [
                    { speaker: 'Villain', name: 'Vince', text: `Emergency? Sounds like future worries. Let's live now with $${amountAllocateEmergency.toLocaleString()}.`, align: 'right', color: 'rose' },
                    { speaker: 'Mentor', name: 'Ari', text: `Building resilience. $${amountAllocateEmergency.toLocaleString()} towards your shield. Smart move.`, align: 'left', color: 'indigo' }
                ];
            
            case 'ALLOCATE_UNALLOCATED_TO_EMERGENCY': // New composite action
                const allocateUnallocatedPayload = lastEvent.payload as { amount: number };
                const amountAllocateUnallocated = allocateUnallocatedPayload.amount;
                return [
                    { speaker: 'Villain', name: 'Vince', text: `Why move $${amountAllocateUnallocated.toLocaleString()} from one safe place to another? Pointless.`, align: 'right', color: 'rose' },
                    { speaker: 'Mentor', name: 'Ari', text: `Fortifying your shield with $${amountAllocateUnallocated.toLocaleString()}. That's how we build true security.`, align: 'left', color: 'indigo' }
                ];

            case 'WITHDRAW_FROM_EMERGENCY':
                const withdrawEmergencyPayload = lastEvent.payload as { amount: number; note?: string };
                const amountWithdrawEmergency = withdrawEmergencyPayload.amount;
                return [
                    { speaker: 'Villain', name: 'Vince', text: `Finally! Time to use that $${amountWithdrawEmergency.toLocaleString()}!`, align: 'right', color: 'rose' },
                    { speaker: 'Mentor', name: 'Ari', text: `A true emergency for $${amountWithdrawEmergency.toLocaleString()}? Or a temptation? Let's be clear on why.`, align: 'left', color: 'indigo' }
                ];

            case 'GOAL_CREATED':
                const newGoalPayload = lastEvent.payload as { id: string; name: string; targetAmount: number };
                return [
                    { speaker: 'Villain', name: 'Vince', text: `Another dream to chase, so far away. When will you ever hit ${newGoalPayload.name}?`, align: 'right', color: 'rose' },
                    { speaker: 'Mentor', name: 'Ari', text: `A clear target like "${newGoalPayload.name}" makes the journey possible. Now, let's fund it.`, align: 'left', color: 'indigo' }
                ];

            case 'ALLOCATE_SAVINGS_TO_GOAL':
                const allocateGoalPayload = lastEvent.payload as { goalId: string; amount: number };
                const amountAllocateGoal = allocateGoalPayload.amount;
                const goalAllocateGoal = snapshot.goals.find(g => g.id === allocateGoalPayload.goalId);
                const goalNameAllocateGoal = goalAllocateGoal ? goalAllocateGoal.name : 'your goal';
                return [
                    { speaker: 'Villain', name: 'Vince', text: `Locking up $${amountAllocateGoal.toLocaleString()} for a faraway prize. Borrring.`, align: 'right', color: 'rose' },
                    { speaker: 'Mentor', name: 'Ari', text: `One step closer to ${goalNameAllocateGoal} with $${amountAllocateGoal.toLocaleString()}. Keep going!`, align: 'left', color: 'indigo' }
                ];
            
            case 'WITHDRAW_GOAL_TO_SAVINGS':
                const withdrawGoalPayload = lastEvent.payload as { goalId: string; amount: number };
                const amountWithdrawGoal = withdrawGoalPayload.amount;
                const goalWithdrawGoal = snapshot.goals.find(g => g.id === withdrawGoalPayload.goalId);
                const goalNameWithdrawGoal = goalWithdrawGoal ? goalWithdrawGoal.name : 'your goal';
                return [
                    { speaker: 'Villain', name: 'Vince', text: `${goalNameWithdrawGoal} abandoned? Good! More for us!`, align: 'right', color: 'rose' },
                    { speaker: 'Mentor', name: 'Ari', text: `Re-evaluating ${goalNameWithdrawGoal}? Or getting sidetracked? Let's ensure this $${amountWithdrawGoal.toLocaleString()} withdrawal is intentional.`, align: 'left', color: 'indigo' }
                ];

            case 'MISSION_COMPLETED':
                return [
                    { speaker: 'Villain', name: 'Vince', text: `Pat on the back! Now where's the real reward?`, align: 'right', color: 'rose' },
                    { speaker: 'Mentor', name: 'Ari', text: `Another milestone. Progress leads to peace and greater control.`, align: 'left', color: 'indigo' }
                ];
            
            case 'MISSION_SKIPPED':
                return [
                    { speaker: 'Villain', name: 'Vince', text: `Smart move! Who needs rules getting in the way of fun?`, align: 'right', color: 'rose' },
                    { speaker: 'Mentor', name: 'Ari', text: `Skipping has consequences. Let's understand them and ensure it was the right call.`, align: 'left', color: 'indigo' }
                ];
            
            case 'UNDO_ALLOCATE_UNALLOCATED_TO_EMERGENCY':
                const undoAllocateUnallocatedPayload = lastEvent.payload as { amount: number };
                const amountUndoAllocateUnallocated = undoAllocateUnallocatedPayload.amount;
                // General undo message for now
                return [
                    { speaker: 'Villain', name: 'Vince', text: `Good, changed your mind, right? Go with your gut!`, align: 'right', color: 'rose' },
                    { speaker: 'Mentor', name: 'Ari', text: `Undoing an action. Let's make sure our choices align with our long-term goals.`, align: 'left', color: 'indigo' }
                ];

            // NEW: WITHDRAW FOR SPENDING FLOW EVENTS
            case 'INITIATE_SPENDING_WITHDRAWAL': {
                const payload = lastEvent.payload as { amount: number; sourceFundId: string };
                const sourceName = payload.sourceFundId === 'emergency' 
                  ? 'Emergency Fund' 
                  : (snapshot.goals.find(g => g.id === payload.sourceFundId)?.name || 'a Goal');
                return [
                  { speaker: 'Villain', name: 'Vince', text: `Freedom! $${payload.amount.toLocaleString()} in your wallet! Time for that impulse purchase?`, align: 'right', color: 'rose' },
                  { speaker: 'Mentor', name: 'Ari', text: `Remember the purpose of this $${payload.amount.toLocaleString()} from ${sourceName}. Spend with intention, not impulse.`, align: 'left', color: 'indigo' }
                ];
            }

            case 'RETURN_SPENDING_WITHDRAWAL': {
                const payload = lastEvent.payload as { amount: number; sourceFundId: string };
                const sourceName = payload.sourceFundId === 'emergency' 
                  ? 'Emergency Fund' 
                  : (snapshot.goals.find(g => g.id === payload.sourceFundId)?.name || 'a Goal');
                return [
                  { speaker: 'Villain', name: 'Vince', text: `Returning $${payload.amount.toLocaleString()}? You're missing out on immediate fun!`, align: 'right', color: 'rose' },
                  { speaker: 'Mentor', name: 'Ari', text: `Excellent discipline. Returning $${payload.amount.toLocaleString()} to ${sourceName} reinforces your plan.`, align: 'left', color: 'indigo' }
                ];
            }

            case 'UPDATE_TRANSACTION':
            case 'DELETE_TRANSACTION':
            default:
                // Fallback for unhandled event types or types without a direct 'amount' in their payload
                return [
                    { speaker: 'Villain', name: 'Vince', text: "What's the big deal? Just another day, right?", align: 'right', color: 'rose' },
                    { speaker: 'Mentor', name: 'Ari', text: "Every action, no matter how small, contributes to your financial story.", align: 'left', color: 'indigo' }
                ];
        }
    }

    // 2. STATE-BASED FALLBACKS (Ambient Atmosphere if no recent event)
    // These are ordered by priority, more specific / urgent first.

    // PRIORITY: Nearing Goal Completion
    const nearingGoal = snapshot.goals.find(g => 
        g.status === 'active' && 
        g.allocatedAmount / g.targetAmount >= 0.8 && // 80% or more complete
        g.allocatedAmount < g.targetAmount // Not fully complete yet
    );
    if (nearingGoal) {
        return [
          { speaker: 'Villain', name: 'Vince', text: `${nearingGoal.name} is almost there! One more big push and it's ours. Maybe borrow a little?`, align: 'right', color: 'rose' },
          { speaker: 'Mentor', name: 'Ari', text: `You're so close to "${nearingGoal.name}"! Stay focused on that final allocation. Consistency now is key.`, align: 'left', color: 'indigo' }
        ];
    }

    // PRIORITY: Emergency Fund is healthy but not maxed (2-3 months runway)
    if (snapshot.emergencyFund > 0 && snapshot.runwayDays >= 60 && snapshot.runwayDays < 90) { 
        return [
          { speaker: 'Villain', name: 'Vince', text: `Your emergency fund is solid. That's enough! Time to shift focus to pure fun, right?`, align: 'right', color: 'rose' },
          { speaker: 'Mentor', name: 'Ari', text: `Your safety net provides great peace of mind. Consider if you want to extend your runway further, or focus on a new growth goal.`, align: 'left', color: 'indigo' }
        ];
    }

    // PRIORITY: Unallocated Savings (existing, enhanced)
    if (snapshot.unallocatedSavings > 100) {
        return [
            { speaker: 'Villain', name: 'Vince', text: `We have $${snapshot.unallocatedSavings.toLocaleString()} just sitting there. Why aren't we having more fun?`, align: 'right', color: 'rose' },
            { speaker: 'Mentor', name: 'Ari', text: `That's excellent unallocated cash. Now, let's give every one of those dollars a job!`, align: 'left', color: 'indigo' }
        ];
    }

    // PRIORITY: Stable & No Goals
    if (summary.status === 'Stable' && snapshot.goals.length === 0 && snapshot.emergencyFund > 0) {
      return [
        { speaker: 'Villain', name: 'Vince', text: "Everything's perfect. No need to complicate things with big plans, just enjoy it!", align: 'right', color: 'rose' },
        { speaker: 'Mentor', name: 'Ari', text: "You've built stability. Now is the perfect time to imagine your next financial adventure. What do you want to achieve?", align: 'left', color: 'indigo' }
      ];
    }

    // GENERAL STATE DIALOGUES (if no more specific ambient triggers)
    switch (summary.status) {
        case 'In Trouble':
            return [
                { speaker: 'Villain', name: 'Vince', text: "Looking at this stresses me out. Just close the app and deal with it next month.", align: 'right', color: 'rose' },
                { speaker: 'Mentor', name: 'Ari', text: "Closing your eyes doesn't fix it. If we face it now, we can fix it. One step at a time.", align: 'left', color: 'indigo' }
            ];
        case 'Stable':
            // General stable message if other specific stable scenarios don't hit
            return [
                { speaker: 'Villain', name: 'Vince', text: "We have extra cash sitting there. Why are we living like we're broke?", align: 'right', color: 'rose' },
                { speaker: 'Mentor', name: 'Ari', text: "We aren't broke, we're secure. Spend the Safe Spending money, but protect the rest.", align: 'left', color: 'indigo' }
            ];
        default: // At Risk
            return [
                { speaker: 'Villain', name: 'Vince', text: "It's just a few dollars. It barely makes a dent.", align: 'right', color: 'rose' },
                { speaker: 'Mentor', name: 'Ari', text: "Small leaks sink big ships. If we tighten up for two days, we'll be back in the green.", align: 'left', color: 'indigo' }
            ];
    }
  };

  const dialogues = getDialogues();

  return (
    <div className="flex flex-col h-full pt-2">
      <header className="px-2 mb-6 text-center">
        <span className="inline-block px-3 py-1 bg-slate-100 rounded-full text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
          Psychology Check
        </span>
        <h1 className="text-2xl font-black text-slate-800">Internal Monologue</h1>
      </header>

      {/* Reality Hook */}
      <div className="mx-4 mb-4 bg-indigo-50 border border-indigo-100 p-4 rounded-2xl flex gap-3 items-center shadow-sm">
        <Sparkles className="text-[#492582] shrink-0" size={18} />
        <p className="text-sm font-bold text-indigo-900">
            Current Vibe: <span className="font-medium italic">"{summary.storyContext}"</span>
        </p>
      </div>

      {/* Chat Container */}
      <div className="flex-1 space-y-8 pb-20 overflow-y-auto no-scrollbar px-2">
        
        {dialogues.map((d, i) => (
             <div key={i} className={`flex ${d.align === 'right' ? 'flex-row-reverse' : ''} items-end gap-3 animate-in slide-in-from-bottom-2 fade-in duration-500`} style={{ animationDelay: `${i * 300}ms` }}>
                
                {/* Animated Avatar */}
                <div className="shrink-0 relative top-1">
                    {d.speaker === 'Villain' 
                        ? <CharacterPortrait character="vince" size={56} popOut={10} className="drop-shadow-md" /> 
                        : <CharacterPortrait character="ari" size={56} popOut={10} className="drop-shadow-md" />
                    }
                </div>

                <div className={`flex flex-col ${d.align === 'right' ? 'items-end' : 'items-start'} max-w-[85%]`}>
                    <span className={`text-[10px] font-black uppercase tracking-widest mb-1 ${d.align === 'right' ? 'mr-1 text-rose-400' : 'ml-1 text-indigo-400'}`}>
                        {d.name}
                    </span>
                    
                    {/* Clean UI Bubble (Duolingo Style) */}
                    <div className={`p-4 rounded-2xl text-sm font-bold leading-relaxed shadow-sm border-2 relative ${
                        d.align === 'right' 
                            ? 'bg-rose-50 text-slate-800 rounded-br-none border-rose-200' 
                            : 'bg-indigo-50 text-slate-800 rounded-bl-none border-indigo-200'
                    }`}>
                        {d.text}
                    </div>
                </div>
            </div>
        ))}

        {/* Action Area */}
        <div className="px-4 py-8">
            <button disabled className="w-full bg-slate-50 text-slate-300 font-bold py-4 rounded-2xl flex items-center justify-center gap-2 cursor-not-allowed border-2 border-dashed border-slate-200">
                <Lock size={18} />
                <span>Next Confrontation Locked</span>
            </button>
        </div>
        
      </div>
    </div>
  );
};

export default Story;