import { reduceEvents, initialState, FinanceEvent, FinanceState } from './events';
import { getFinanceSnapshot } from './selectors';
import { Transaction } from './storage';

/**
 * REGRESSION TEST SUITE
 * 
 * Objective: Verify that money is never created or destroyed incorrectly,
 * and that Undo operations perfectly restore previous states.
 */

// Helper: Mock Event Creator
const mockTx = (amount: number, type: 'income' | 'expense', category: string): FinanceEvent => ({
    id: crypto.randomUUID(),
    timestamp: Date.now(),
    type: 'ADD_TRANSACTION',
    payload: {
        id: crypto.randomUUID(),
        amount,
        type,
        category: category as any,
        date: new Date().toISOString(),
        note: 'Test',
        recurring: false
    } as Transaction
});

export const runRegressionTests = () => {
    let passed = 0;
    let failed = 0;
    const logs: string[] = [];

    const log = (msg: string, success: boolean) => {
        if (success) {
            passed++;
            console.log(`%c✅ ${msg}`, 'color: #22be54; font-weight: bold;');
        } else {
            failed++;
            console.error(`❌ ${msg}`);
            logs.push(`FAIL: ${msg}`);
        }
    };

    console.group('🛡️ CAPITAL HERO REGRESSION SUITE');

    try {
        // --- SCENARIO 1: BASIC ACCUMULATION ---
        let state = initialState;
        state = reduceEvents([
            mockTx(1000, 'income', 'Salary'),
            mockTx(200, 'expense', 'Essentials')
        ]);
        
        let snapshot = getFinanceSnapshot(state);
        const liquidityCheck = snapshot.liquidity === 800;
        log('Scenario 1: Income - Expense = Liquidity (800)', liquidityCheck);

        // --- SCENARIO 2: ALLOCATION CLAMPING (Prevent Negative Available) ---
        // Context: We have 800 available. We allocate 500 to savings.
        const allocateEvent: FinanceEvent = {
            id: 'evt_alloc_1',
            timestamp: Date.now(),
            type: 'ALLOCATE_TO_SAVINGS',
            payload: { amount: 500 }
        };
        
        // Re-building event list approach (More robust)
        const eventsStep2 = [
            mockTx(1000, 'income', 'Salary'),
            mockTx(200, 'expense', 'Essentials'),
            allocateEvent
        ];
        state = reduceEvents(eventsStep2); // Reducer builds from initial
        snapshot = getFinanceSnapshot(state);
        
        const savingsCheck = state.savingsBalance === 500;
        const availableCheck = snapshot.availableBalance === 300; // 800 - 500
        log('Scenario 2: Allocation reduces Available Balance correctly', savingsCheck && availableCheck);


        // --- SCENARIO 3: GOAL MOVEMENT CONSERVATION ---
        // Context: We have 500 in savings. We move 300 to a Goal.
        // If we try to move 600 (more than in savings), it should clamp or result in 0 change depending on logic.
        // Our reducer logic: `Math.min(currentSavings, amount)`
        const createGoalEvent: FinanceEvent = {
            id: 'evt_goal_1',
            timestamp: Date.now(),
            type: 'GOAL_CREATED',
            payload: { id: 'goal_1', name: 'Test Goal', targetAmount: 1000 }
        };
        const moveGoalEvent: FinanceEvent = {
            id: 'evt_move_1',
            timestamp: Date.now(),
            type: 'ALLOCATE_SAVINGS_TO_GOAL',
            payload: { goalId: 'goal_1', amount: 600 } // Intentional Overdraft Attempt (Only 500 in savings)
        };

        const eventsStep3 = [...eventsStep2, createGoalEvent, moveGoalEvent];
        state = reduceEvents(eventsStep3);
        
        // Expectation: It moved ALL 500, leaving 0 in savings, and 500 in goal. (Clamping)
        const goal = state.goals.find(g => g.id === 'goal_1');
        const clampingWorks = state.savingsBalance === 0 && goal?.allocatedAmount === 500;
        log('Scenario 3: Savings -> Goal Clamping (Prevent duplicate money)', clampingWorks);


        // --- SCENARIO 4: UNDO LOGIC (The Time Machine) ---
        // Context: Undo the last action (The move to goal).
        // Inverse of ALLOCATE_SAVINGS_TO_GOAL is WITHDRAW_GOAL_TO_SAVINGS
        const undoEvent: FinanceEvent = {
            id: 'evt_undo_1',
            timestamp: Date.now(),
            type: 'WITHDRAW_GOAL_TO_SAVINGS',
            payload: { goalId: 'goal_1', amount: 600 }, // Using same payload as original
            reversesEventId: 'evt_move_1'
        };

        const eventsStep4 = [...eventsStep3, undoEvent];
        state = reduceEvents(eventsStep4);

        // Expectation: 
        // Goal was 500. We ask to withdraw 600.
        // Reducer `WITHDRAW_GOAL_TO_SAVINGS` logic: `Math.min(g.allocatedAmount, amount)`
        // So it withdraws 500 (all of it) back to savings.
        // Savings should be 500. Goal 0.
        
        const undoSavingsCheck = state.savingsBalance === 500;
        const undoGoalCheck = state.goals.find(g => g.id === 'goal_1')?.allocatedAmount === 0;
        log('Scenario 4: Undo operation restores exact previous state', undoSavingsCheck && undoGoalCheck);


        // --- SCENARIO 5: PREVENT NEGATIVE BUCKETS ---
        // Withdraw more than exists from Savings
        const withdrawEvent: FinanceEvent = {
            id: 'evt_wd_1',
            timestamp: Date.now(),
            type: 'WITHDRAW_FROM_SAVINGS',
            payload: { amount: 9999 }
        };
        const eventsStep5 = [...eventsStep4, withdrawEvent];
        state = reduceEvents(eventsStep5);
        
        const negativeCheck = state.savingsBalance === 0; // Should clamp to 0, not -9499
        log('Scenario 5: Negative Balance Protection (Bucket Floor)', negativeCheck);


        // --- SCENARIO 6: ALLOCATE UNALLOCATED TO EMERGENCY & UNDO ---
        // Reset state for this scenario for clarity
        let eventsStep6: FinanceEvent[] = [
            mockTx(1000, 'income', 'Salary'), // Liquidity 1000
            { id: 'evt_init_savings', timestamp: Date.now(), type: 'ALLOCATE_TO_SAVINGS', payload: { amount: 300 } }, // savings 300, available 700
            { id: 'evt_init_emergency', timestamp: Date.now(), type: 'ALLOCATE_TO_EMERGENCY', payload: { amount: 200 } }, // emergency 200, available 500
        ];
        state = reduceEvents(eventsStep6);
        let preActionSavings = state.savingsBalance; // 300
        let preActionEmergency = state.emergencyFundBalance; // 200
        let preActionXP = state.xp; // Should be 200 (100 for income, 50 for savings, 50 for emergency)

        const allocateUnallocatedToEmergencyEvent: FinanceEvent = {
            id: 'evt_unalloc_to_emergency',
            timestamp: Date.now(),
            type: 'ALLOCATE_UNALLOCATED_TO_EMERGENCY',
            payload: { amount: 150 } // Move 150 from savings to emergency
        };
        eventsStep6.push(allocateUnallocatedToEmergencyEvent);
        state = reduceEvents(eventsStep6);

        const afterAllocSavings = state.savingsBalance === (preActionSavings - 150); // 300 - 150 = 150
        const afterAllocEmergency = state.emergencyFundBalance === (preActionEmergency + 150); // 200 + 150 = 350
        const afterAllocXP = state.xp === (preActionXP + 50); // XP increased
        log('Scenario 6a: Unallocated to Emergency allocation correct', afterAllocSavings && afterAllocEmergency && afterAllocXP);

        // Undo the last action
        const undoUnallocatedToEmergencyEvent: FinanceEvent = {
            id: 'evt_undo_unalloc_to_emergency',
            timestamp: Date.now(),
            type: 'UNDO_ALLOCATE_UNALLOCATED_TO_EMERGENCY',
            payload: { amount: 150 },
            reversesEventId: 'evt_unalloc_to_emergency'
        };
        eventsStep6.push(undoUnallocatedToEmergencyEvent);
        state = reduceEvents(eventsStep6);

        const afterUndoSavings = state.savingsBalance === preActionSavings; // Should be 300 again
        const afterUndoEmergency = state.emergencyFundBalance === preActionEmergency; // Should be 200 again
        const afterUndoXP = state.xp === preActionXP; // XP reverted
        log('Scenario 6b: Undo Unallocated to Emergency allocation restores state', afterUndoSavings && afterUndoEmergency && afterUndoXP);


    } catch (e) {
        console.error(e);
        log('CRITICAL: Test execution crashed', false);
    }

    console.log(`%c🏁 RESULT: ${passed} Passed | ${failed} Failed`, 'font-size: 14px; font-weight: bold;');
    console.groupEnd();
    
    return { passed, failed, logs };
};