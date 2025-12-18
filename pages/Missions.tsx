import React from 'react';
import { CheckCircle2, Target, ArrowRight, ShieldAlert, Database, Zap, RefreshCw, Check, Sparkles, X, Lock } from 'lucide-react';
import { useFinance } from '../hooks/useFinance';
import { MissionIconType, MissionColor } from '../finance/missions';
import { useNavigate } from 'react-router-dom';
import { handleNextStep } from '../finance/nextStepActions';

const Missions: React.FC = () => {
  const { activeMission, completeMission, skipMission, openSheet, nextSteps, snapshot } = useFinance();
  const navigate = useNavigate();

  const isSystemStable = activeMission.id === 'system_stable';
  const isNoMissionsFallback = activeMission.id === 'no_missions_yet';

  // Helper to render icons based on string name
  const renderIcon = (name: MissionIconType, colorClass: string) => {
    const props = { className: `w-12 h-12 ${colorClass}` };
    switch (name) {
      case 'refresh': return <RefreshCw {...props} />;
      case 'database': return <Database {...props} />;
      case 'shield-alert': return <ShieldAlert {...props} />;
      case 'zap': return <Zap {...props} />;
      case 'target': return <Target {...props} />;
      case 'sparkles': return <Sparkles {...props} />;
      case 'check-circle': return <CheckCircle2 {...props} />;
      case 'lock': return <Lock {...props} />;
      default: return <Target {...props} />;
    }
  };

  const getThemeStyles = (color: MissionColor) => {
    switch (color) {
      case 'indigo': return { bg: 'bg-indigo-50', text: 'text-indigo-600', button: 'bg-[#492582] border-[#351a60]' };
      case 'green': return { bg: 'bg-green-50', text: 'text-green-600', button: 'bg-green-500 border-green-600' };
      case 'rose': return { bg: 'bg-rose-50', text: 'text-rose-600', button: 'bg-rose-500 border-rose-600' };
      case 'amber': return { bg: 'bg-amber-50', text: 'text-amber-600', button: 'bg-amber-500 border-amber-600' };
      case 'slate': return { bg: 'bg-slate-50', text: 'text-slate-400', button: 'bg-slate-800 border-slate-900' };
      default: return { bg: 'bg-indigo-50', text: 'text-indigo-600', button: 'bg-[#492582] border-[#351a60]' };
    }
  };

  const theme = getThemeStyles(activeMission.color);

  const handleAction = () => {
    if (activeMission.actionView) {
        openSheet(activeMission.actionView);
    } else if (activeMission.actionPath) {
        navigate(activeMission.actionPath);
    }
  };

  return (
    <div className="flex flex-col min-h-[80vh] py-4">
      <header className="px-2 text-center mb-8">
        <h1 className="text-xs font-black text-slate-300 uppercase tracking-widest">
            {isNoMissionsFallback ? 'Current Status' : (isSystemStable ? 'Status Report' : 'Next Financial Step')}
        </h1>
      </header>

      <div className="flex-1 flex flex-col justify-center relative">
          {/* Active State */}
          <div className="bg-white rounded-3xl border-2 border-slate-200 shadow-xl p-8 flex flex-col items-center text-center space-y-8 animate-in slide-in-from-bottom-4 duration-500">
             <div className={`${theme.bg} p-6 rounded-full transition-colors shadow-inner ${!isSystemStable && !isNoMissionsFallback ? 'rotate-3' : ''}`}>
                {renderIcon(activeMission.iconName, theme.text)}
             </div>
             
             <div className="space-y-3">
                <h2 className={`text-3xl font-black leading-tight ${isSystemStable || isNoMissionsFallback ? 'text-slate-400' : 'text-slate-800'}`}>
                    {activeMission.title}
                </h2>
                <p className="text-slate-500 font-medium text-lg leading-relaxed">
                    {activeMission.desc}
                </p>
             </div>

               <div className="space-y-3">
                 {nextSteps.map((s) => {
                   // Build suggested payloads per action (quick heuristics)
                   const avail = snapshot.availableBalance || 0;
                   const suggested25 = avail > 0 ? Math.max(50, Math.floor(avail * 0.25)) : 50;
                   const suggested10 = avail > 0 ? Math.max(25, Math.floor(avail * 0.1)) : 25;

                   const payload = (() => {
                     switch (s.action) {
                       case 'allocate_emergency':
                         return { transfer: { amount: Math.min(suggested25, Math.floor(avail)), transferTarget: 'emergency', transferDirection: 'deposit' } };
                       case 'build_savings':
                         return { transfer: { amount: Math.min(suggested25, Math.floor(avail)), transferTarget: 'savings', transferDirection: 'deposit' } };
                       case 'reduce_spending':
                         return { withdraw: { amount: Math.min(suggested10, Math.floor(avail)) } };
                       case 'increase_income':
                         return { income: { amount: Math.max(50, Math.floor(avail * 0.05)), category: 'Other' } };
                       case 'pay_bills':
                         return { transfer: { amount: Math.min(suggested10, Math.floor(avail)), transferTarget: 'savings', transferDirection: 'deposit' } };
                       default:
                         return undefined;
                     }
                   })();

                   return (
                     <button
                       key={`${s.action}-${s.title}`}
                       onClick={() => handleNextStep(s.action, { openSheet, navigate }, payload)}
                       className="w-full bg-white p-5 rounded-3xl border-2 border-slate-100 flex items-center justify-between active:scale-95 transition-all text-left"
                     >
                       <div>
                         <h4 className="font-black text-slate-800 text-sm mb-1">{s.title}</h4>
                         <p className="text-xs font-medium text-slate-400">{s.message}</p>
                       </div>
                       <span className="text-[11px] font-black uppercase tracking-widest px-3 py-1 rounded-full border border-slate-200 text-slate-500">
                         {s.action}
                       </span>
                     </button>
                   )
                 })}
               </div>
          </div>

          {/* SKIP BUTTON - Hidden if no missions fallback */}
          {!isNoMissionsFallback && (
             <div className="text-center mt-6">
                 <button
                    onClick={() => skipMission(activeMission)}
                    className="text-slate-300 font-bold text-xs hover:text-slate-500 transition-colors flex items-center justify-center gap-1 mx-auto py-2 px-4 rounded-xl hover:bg-slate-50"
                    aria-label="Dismiss mission"
                 >
                    <X size={14} />
                    <span>Not right now</span>
                 </button>
             </div>
          )}

          {/* NEXT STEPS - moved from Progress */}
          {nextSteps && nextSteps.length > 0 && (
            <section className="space-y-6 px-4 mt-8">
               <div className="pl-2 text-center">
                  <h2 className="text-xs font-black text-slate-300 uppercase tracking-widest mb-1">Próximos pasos</h2>
               </div>

               <div className="space-y-3">
                 {nextSteps.map((s) => {
                  // Build suggested payloads per action (quick heuristics)
                  const avail = snapshot.availableBalance || 0;
                  const suggested25 = avail > 0 ? Math.max(50, Math.floor(avail * 0.25)) : 50;
                  const suggested10 = avail > 0 ? Math.max(25, Math.floor(avail * 0.1)) : 25;

                   const payload = (() => {
                     switch (s.action) {
                       case 'allocate_emergency':
                         return { transfer: { amount: Math.min(suggested25, Math.floor(avail)), transferTarget: 'emergency', transferDirection: 'deposit' } };
                       case 'build_savings':
                         return { transfer: { amount: Math.min(suggested25, Math.floor(avail)), transferTarget: 'savings', transferDirection: 'deposit' } };
                       case 'reduce_spending':
                         return { withdraw: { amount: Math.min(suggested10, Math.floor(avail)) } };
                       case 'increase_income':
                         return { income: { amount: Math.max(50, Math.floor(avail * 0.05)), category: 'Other' } };
                       case 'pay_bills':
                         return { transfer: { amount: Math.min(suggested10, Math.floor(avail)), transferTarget: 'savings', transferDirection: 'deposit' } };
                       default:
                         return undefined;
                     }
                   })();

                   return (
                   <button
                     key={`${s.action}-${s.title}`}
                     onClick={() => handleNextStep(s.action, { openSheet, navigate }, payload)}
                     className="w-full bg-white p-5 rounded-3xl border-2 border-slate-100 flex items-center justify-between active:scale-95 transition-all text-left"
                   >
                     <div>
                       <h4 className="font-black text-slate-800 text-sm mb-1">{s.title}</h4>
                       <p className="text-xs font-medium text-slate-400">{s.message}</p>
                     </div>
                    <span className="text-[11px] font-black uppercase tracking-widest px-3 py-1 rounded-full border border-slate-200 text-slate-500">
                       {s.action}
                     </span>
                   </button>
                  )})}
               </div>
            </section>
          )}
      </div>
    </div>
  );
};

export default Missions;