import React, { useState } from 'react';
import { ArrowRight, ShieldCheck, AlertTriangle, Lock, Plus, Minus, Info, ArrowRightLeft, Target, ShieldAlert, Sparkles, CalendarClock, PiggyBank, NotebookPen, Wallet, Shield, ArrowUpRight } from 'lucide-react';
import { useFinance, NextStep } from '../hooks/useFinance';
import { CharacterPortrait } from '../components/PixelAvatars';
import { useNavigate } from 'react-router-dom';
import { SheetView, Goal } from '../finance/storage';
import GoalsModal from '../components/GoalsModal';
import AllocateToEmergencyModal from '../components/AllocateToEmergencyModal';

type StepMeta = {
  label: string;
  icon: React.ComponentType<{ className?: string; size?: number }>;
  color: string;
  bg: string;
  pill: string;
};

const ControlView: React.FC = () => {
  const { summary, snapshot, nextSteps, openSheet } = useFinance();
  const navigate = useNavigate();

  // Local State for Goals Modal
  const [isGoalModalOpen, setGoalModalOpen] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);

  // Local State for AllocateToEmergencyModal
  const [isAllocateEmergencyModalOpen, setAllocateEmergencyModalOpen] = useState(false);

  const handleOpenNewGoal = () => {
      setSelectedGoal(null);
      setGoalModalOpen(true);
  };

  const handleOpenGoal = (goal: Goal) => {
      setSelectedGoal(goal);
      setGoalModalOpen(true);
  };

  const handleCloseGoalModal = () => {
      setGoalModalOpen(false);
      setSelectedGoal(null);
  };

  const handleOpenAllocateEmergencyModal = () => {
      setAllocateEmergencyModalOpen(true);
  };

  const handleCloseAllocateEmergencyModal = () => {
      setAllocateEmergencyModalOpen(false);
  };


  // --- BLOCK 1: GENERAL STATE (EMOTIONAL ANCHOR) ---
  const margin = snapshot.availableBalance; // Main number is now Available Balance (Real Disposable)

  // Ari's Voice (Mandatory Text)
  const getAriStatusMessage = () => {
    switch (summary.status) {
        case 'Stable': return "You’re in control. This available balance is truly yours to allocate.";
        case 'At Risk': return "We have some unassigned cash, but bills are looming. Allocate wisely.";
        case 'In Trouble': return "Things are tight. The goal right now is to stop making it worse.";
    }
  };

  const getStatusColorStyles = () => {
    switch (summary.status) {
        case 'Stable': return { 
            bg: 'bg-green-50', 
            border: 'border-green-200', 
            text: 'text-[#22be54]', 
            badgeBg: 'bg-white',
            badgeText: 'text-[#22be54]' 
        };
        case 'In Trouble': return { 
            bg: 'bg-rose-50', 
            border: 'border-rose-200', 
            text: 'text-rose-500', 
            badgeBg: 'bg-white',
            badgeText: 'text-rose-500' 
        };
        default: return { 
            bg: 'bg-amber-50', 
            border: 'border-amber-200', 
            text: 'text-amber-500', 
            badgeBg: 'bg-white',
            badgeText: 'text-amber-500' 
        };
    }
  };

  const styles = getStatusColorStyles();


  // --- BLOCK 3: STRATEGIC READING (The Logic) ---
  const getStrategicReading = () => {
    const { status } = summary;
    const { totalSavings, runwayDays } = snapshot;

    if (status === 'In Trouble') {
      return "Right now, spending control matters more than saving.";
    }
    
    if (status === 'At Risk') {
        if (runwayDays < 14) return "You're safe today, but one surprise would hurt.";
        return "You have coverage, but your monthly flow is negative.";
    }
    
    // Stable
    if (totalSavings === 0) {
        return "You have stability. Now we can start building a buffer.";
    }
    
    return "You’re stable. You have options to grow or optimize.";
  };

  const renderEmptyGoalsState = () => (
    <div className="text-center py-8 flex flex-col items-center justify-center text-slate-300 border-2 border-dashed border-slate-100 rounded-3xl bg-white space-y-4">
        <CharacterPortrait character="ari" size={64} popOut={12} className="drop-shadow-md" />
        <p className="font-black text-sm text-slate-600">No goals yet!</p>
        <p className="text-xs font-medium text-slate-400 max-w-[80%]">
            Where do you want to go? Let's define your first mission and start allocating funds.
        </p>
        <button 
            onClick={handleOpenNewGoal}
            className="w-4/5 py-3 rounded-xl text-sm font-bold text-white shadow-lg active:scale-95 transition-transform mt-4 bg-indigo-600 border-b-4 border-indigo-700"
            aria-label="Set a new goal"
        >
            <Target size={16} className="inline-block mr-2" /> Set a New Goal
        </button>
    </div>
  );

  const getStepMeta = (missionId: string): StepMeta => {
    const map: Record<string, StepMeta> = {
      check_balances: { label: 'Riesgo inmediato', icon: ShieldAlert, color: 'text-rose-600', bg: 'bg-rose-50', pill: 'bg-rose-100 text-rose-700 border-rose-200' },
      add_income: { label: 'Datos esenciales', icon: Wallet, color: 'text-indigo-600', bg: 'bg-indigo-50', pill: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
      add_recurring: { label: 'Compromisos fijos', icon: CalendarClock, color: 'text-amber-600', bg: 'bg-amber-50', pill: 'bg-amber-100 text-amber-700 border-amber-200' },
      cover_threat: { label: 'Pago próximo', icon: AlertTriangle, color: 'text-rose-600', bg: 'bg-rose-50', pill: 'bg-rose-100 text-rose-700 border-rose-200' },
      daily_checkin: { label: 'Disciplina diaria', icon: NotebookPen, color: 'text-slate-600', bg: 'bg-slate-50', pill: 'bg-slate-100 text-slate-700 border-slate-200' },
      start_emergency: { label: 'Fondo de seguridad', icon: Shield, color: 'text-emerald-600', bg: 'bg-emerald-50', pill: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
      assign_surplus: { label: 'Usa excedentes', icon: PiggyBank, color: 'text-amber-600', bg: 'bg-amber-50', pill: 'bg-amber-100 text-amber-700 border-amber-200' },
      system_stable: { label: 'Sin alertas', icon: ShieldCheck, color: 'text-slate-500', bg: 'bg-slate-50', pill: 'bg-slate-100 text-slate-600 border-slate-200' },
      no_missions_yet: { label: 'Modo relax', icon: Sparkles, color: 'text-indigo-500', bg: 'bg-indigo-50', pill: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
    };
    return map[missionId] || { label: 'Optimización', icon: Sparkles, color: 'text-slate-500', bg: 'bg-slate-50', pill: 'bg-slate-100 text-slate-600 border-slate-200' };
  };

  const handleStepAction = (step: NextStep) => {
    if (step.isBlocked) return;
    if (step.actionType === 'sheet') {
      openSheet((step.actionPayload as SheetView) || 'menu');
    } else if (step.actionType === 'navigate' && step.actionPayload) {
      navigate(step.actionPayload);
    }
  };

  const primaryStep = nextSteps[0];
  const secondarySteps = nextSteps.slice(1);

  return (
    <div className="space-y-10 pt-6 pb-20">
      
      {/* HEADER */}
      <header className="px-4">
        <h1 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-1">Control View</h1>
        <p className="text-slate-800 font-bold text-3xl">Clarity & Decision</p>
      </header>

      {/* BLOCK 1: GENERAL STATE */}
      <section className="px-4">
        <div className={`rounded-[2rem] border-2 p-8 flex flex-col items-center text-center space-y-6 ${styles.bg} ${styles.border}`}>
            
            {/* Status Badge */}
            <div className={`flex items-center gap-2 px-4 py-1.5 rounded-full border border-current shadow-sm ${styles.badgeBg} ${styles.badgeText}`}>
                {summary.status === 'Stable' ? <ShieldCheck size={16} strokeWidth={3} /> : <AlertTriangle size={16} strokeWidth={3} />}
                <span className="text-xs font-black uppercase tracking-wide">{summary.status}</span>
            </div>

            {/* The Real Margin Number */}
            <div className="space-y-2">
                <span className={`text-6xl font-black tracking-tighter block ${margin < 0 ? 'text-rose-500' : 'text-slate-800'}`}>
                    {margin < 0 ? '-' : ''}${Math.abs(margin).toLocaleString()}
                </span>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block">
                    Available Balance
                </span>
            </div>

            {/* ACTION BUTTON - MOVE MONEY */}
            {margin > 0 && (
                <button 
                    onClick={() => openSheet('transfer')}
                    className="flex items-center gap-2 bg-slate-900 text-white px-5 py-3 rounded-xl font-bold text-sm shadow-lg active:scale-95 transition-transform"
                    aria-label="Move money to savings or emergency fund"
                >
                    <ArrowRightLeft size={16} />
                    <span>Move Money</span>
                </button>
            )}

            {/* Ari's Voice (The Coach) */}
            <div className="flex items-start gap-4 text-left bg-white/70 p-5 rounded-2xl border border-slate-200/50 w-full shadow-sm">
                <CharacterPortrait character="ari" size={48} className="shrink-0" />
                <p className="text-sm font-bold leading-relaxed text-slate-700 pt-1">
                    "{getAriStatusMessage()}"
                </p>
            </div>
        </div>
      </section>

      {/* BLOCK 2: INCOME & SPENDING (Row) */}
      <section className="px-4 grid grid-cols-2 gap-3">
             {/* 1. Income */}
             <div className="bg-white p-5 rounded-3xl border-2 border-slate-100 flex flex-col justify-between h-32">
                 <div className="flex justify-between items-start">
                    <span className="text-xs font-bold text-slate-400 uppercase">Income</span>
                    {summary.totalIncome > 0 ? (
                        <div className="bg-green-100 text-green-600 p-2 rounded-xl"><Plus size={16} /></div>
                    ) : (
                        <div className="bg-slate-100 text-slate-300 p-2 rounded-xl"><Minus size={16} /></div>
                    )}
                 </div>
                 <span className="text-xl font-black text-slate-800 block">
                     ${summary.totalIncome.toLocaleString()}
                 </span>
             </div>

             {/* 2. Spending */}
             <div className="bg-white p-5 rounded-3xl border-2 border-slate-100 flex flex-col justify-between h-32">
                 <div className="flex justify-between items-start">
                    <span className="text-xs font-bold text-slate-400 uppercase">Spending</span>
                    <div className={`p-2 rounded-xl ${summary.totalExpenses > summary.totalIncome ? 'bg-rose-100 text-rose-500' : 'bg-slate-100 text-slate-400'}`}>
                        <Minus size={16} />
                    </div>
                 </div>
                 <span className="text-xl font-black text-slate-800 block">
                     ${summary.totalExpenses.toLocaleString()}
                 </span>
             </div>
      </section>

      {/* BLOCK 3: SAVINGS & GOALS (Expanded Section) */}
      <section className="px-4 space-y-4">
         <div className="flex items-center justify-between px-2">
             <h2 className="text-xs font-black text-slate-300 uppercase tracking-widest">Savings & Goals</h2>
             <button onClick={handleOpenNewGoal} className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg hover:bg-indigo-100 transition-colors flex items-center gap-1"
                aria-label="Set a new financial goal"
             >
                 <Plus size={12} strokeWidth={3} />
                 New Goal
             </button>
         </div>

         {/* Unallocated Savings Source */}
         <div className="bg-indigo-50 p-5 rounded-3xl border-2 border-indigo-100 flex items-center justify-between">
             <div>
                <span className="text-xs font-bold text-indigo-400 uppercase block mb-1">Unallocated Cash</span>
                <span className="text-3xl font-black text-indigo-900 block">
                    ${snapshot.unallocatedSavings.toLocaleString()}
                </span>
                <p className="text-[10px] text-indigo-400 font-bold mt-1">Available to assign to goals</p>
             </div>
             <div className="bg-white text-indigo-300 p-3 rounded-2xl shadow-sm"><Lock size={24} /></div>
         </div>

         {/* Goals List (Cards) */}
         <div className="space-y-3">
             {snapshot.goals.length === 0 ? (
                 renderEmptyGoalsState()
             ) : (
                 snapshot.goals.map(g => {
                     const progress = Math.min(100, (g.allocatedAmount / g.targetAmount) * 100);
                     const isComplete = progress >= 100;
                     return (
                        <button 
                            key={g.id}
                            onClick={() => handleOpenGoal(g)}
                            className="w-full bg-white p-5 rounded-3xl border-2 border-slate-100 shadow-sm active:scale-95 transition-all group text-left relative overflow-hidden"
                            aria-label={`View details for goal: ${g.name}`}
                        >
                            {/* Subtle Progress Background */}
                            <div className="absolute bottom-0 left-0 h-1.5 bg-indigo-500 transition-all duration-1000" style={{ width: `${progress}%` }}></div>
                            
                            <div className="flex justify-between items-start mb-4 relative z-10">
                                <div>
                                    <h3 className="text-lg font-black text-slate-800">{g.name}</h3>
                                    {isComplete && <span className="text-[10px] font-bold text-green-600 uppercase tracking-wider">Goal Met!</span>}
                                </div>
                                <div className="bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-xl text-xs font-bold">
                                    Add funds
                                </div>
                            </div>

                            <div className="space-y-2 relative z-10">
                                <div className="flex justify-between items-end">
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-2xl font-black text-slate-700">${g.allocatedAmount.toLocaleString()}</span>
                                        <span className="text-xs font-bold text-slate-400">of ${g.targetAmount.toLocaleString()}</span>
                                    </div>
                                    <span className="text-xs font-bold text-indigo-500">{Math.round(progress)}%</span>
                                </div>
                                
                                {/* Bar */}
                                <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                                    <div className={`h-full rounded-full transition-all duration-500 ${isComplete ? 'bg-green-500' : 'bg-indigo-500'}`} style={{ width: `${progress}%` }}></div>
                                </div>
                            </div>
                        </button>
                     );
                 })
             )}
         </div>
      </section>

      {/* BLOCK 4: EMERGENCY FUND & INSIGHT */}
      <section className="px-4 space-y-6">
         <h2 className="text-xs font-black text-slate-300 uppercase tracking-widest pl-2">Safety Net</h2>
         
         <div className="bg-white p-5 rounded-3xl border-2 border-slate-100 flex items-center justify-between">
             <div>
                <span className="text-xs font-bold text-slate-400 uppercase block mb-1">Emergency Fund</span>
                <div className="flex flex-col mb-1">
                     <span className="text-2xl font-black text-slate-800">
                        ${snapshot.emergencyFund.toLocaleString()}
                    </span>
                    <span className="text-xs font-bold text-slate-400">
                        Covers ~{snapshot.runwayDays >= 9999 ? '∞' : snapshot.runwayDays} days
                    </span>
                </div>
                <p className="text-xs font-medium text-slate-500">
                    {snapshot.emergencyFund === 0 ? "Not started." : "Protecting you."}
                </p>
             </div>
             {snapshot.unallocatedSavings > 0 ? (
                <button
                    onClick={handleOpenAllocateEmergencyModal}
                    className="bg-amber-500 text-white p-3 rounded-2xl shadow-md active:scale-95 transition-transform flex items-center justify-center gap-1"
                    aria-label="Add funds to emergency fund"
                >
                    <Plus size={20} />
                    <span className="text-sm font-bold hidden md:inline">Add Funds</span>
                </button>
             ) : (
                <div className="bg-amber-50 text-amber-500 p-3 rounded-2xl">
                    <ShieldCheck size={24} />
                </div>
             )}
         </div>

         {/* Insight Card */}
         <div className="bg-[#492582] text-white p-8 rounded-[2rem] shadow-xl shadow-purple-200 relative overflow-hidden">
             {/* Decor */}
             <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
             
             <div className="relative z-10 space-y-4">
                 <div className="flex items-center gap-3">
                    <div className="bg-white/20 p-2 rounded-xl backdrop-blur-sm">
                        <Info size={20} className="text-purple-100" />
                    </div>
                    <span className="text-xs font-black uppercase tracking-widest text-purple-200">Insight</span>
                 </div>
                 <h3 className="text-xl font-bold leading-relaxed text-white">
                     "{getStrategicReading()}"
                 </h3>
             </div>
          </div>
      </section>

      {/* BLOCK 5: NEXT STEPS (moved to Missions) */}

      {/* BLOCK 6: CLOSURE */}
      <section className="px-6 py-6 text-center">
        <button 
           onClick={() => primaryStep ? handleStepAction(primaryStep) : navigate('/missions')}
           disabled={primaryStep?.isBlocked}
           className={`w-full ${primaryStep?.isBlocked ? 'bg-slate-200 text-slate-500 border border-slate-300 cursor-not-allowed' : 'bg-slate-900 text-white'} font-bold text-lg py-5 rounded-3xl shadow-lg active:scale-95 transition-transform flex items-center justify-center gap-3`}
           aria-label="Ir al siguiente paso"
        >
            <span>{primaryStep ? primaryStep.ctaLabel : 'Go to Next Step'}</span>
            <ArrowRight size={20} />
        </button>
        {primaryStep?.isBlocked && (
          <p className="text-xs font-semibold text-rose-500 mt-3 flex items-center justify-center gap-2">
            <Lock size={14} />
            {primaryStep.blockedReason}
          </p>
        )}
      </section>

      <GoalsModal 
        isOpen={isGoalModalOpen} 
        onClose={handleCloseGoalModal} 
        goal={selectedGoal} 
      />

      {/* Fix: Corrected typo in prop name from isAllocateEmergencyModalModalOpen to isAllocateEmergencyModalOpen */}
      <AllocateToEmergencyModal
        isOpen={isAllocateEmergencyModalOpen}
        onClose={handleCloseAllocateEmergencyModal}
      />
    </div>
  );
};

export default ControlView;
