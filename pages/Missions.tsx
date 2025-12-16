import React from 'react';
import { CheckCircle2, Target, ArrowRight, ShieldAlert, Database, Zap, RefreshCw, Check, Sparkles, X, Lock } from 'lucide-react';
import { useFinance } from '../hooks/useFinance';
import { MissionIconType, MissionColor } from '../finance/missions';
import { useNavigate } from 'react-router-dom';

const Missions: React.FC = () => {
  const { activeMission, completeMission, skipMission, openSheet } = useFinance();
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

             <div className="w-full space-y-4 pt-2">
                 {/* PRIMARY BUTTON */}
                 {activeMission.actionPath ? ( // Use actionPath if it exists
                     <button
                        onClick={handleAction}
                        className={`w-full text-white font-bold text-xl py-5 px-6 rounded-2xl border-b-4 active:border-b-0 active:translate-y-1 transition-all flex items-center justify-center gap-3 group ${theme.button}`}
                     >
                        <span>{activeMission.actionLabel}</span>
                        {(activeMission.showArrow === undefined || activeMission.showArrow) && <ArrowRight size={24} className="group-hover:translate-x-1 transition-transform" />}
                     </button>
                 ) : activeMission.actionView ? ( // Use actionView if it exists
                     <button
                        onClick={handleAction}
                        className={`w-full text-white font-bold text-xl py-5 px-6 rounded-2xl border-b-4 active:border-b-0 active:translate-y-1 transition-all flex items-center justify-center gap-3 group ${theme.button}`}
                     >
                        <span>{activeMission.actionLabel}</span>
                        {(activeMission.showArrow === undefined || activeMission.showArrow) && <ArrowRight size={24} className="group-hover:translate-x-1 transition-transform" />}
                     </button>
                 ) : ( // Fallback for missions with no defined action, or for the 'no missions' state
                     <button
                        disabled // Disable if no action is explicitly defined
                        className="w-full bg-slate-100 text-slate-400 font-bold text-lg py-5 px-6 rounded-2xl border-2 border-slate-200 cursor-not-allowed flex items-center justify-center gap-3"
                     >
                        <span>No Action Available</span>
                        <Lock size={20} />
                     </button>
                 )}
                
                {/* Conditional hint for action type */}
                {!isSystemStable && !isNoMissionsFallback && (activeMission.actionView || activeMission.actionPath) && (activeMission.showArrow === undefined || activeMission.showArrow) && (
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-2">
                        {activeMission.actionView ? "This opens the money menu below" : "This takes you to the section"}
                    </p>
                )}

                 {/* SECONDARY BUTTON (Completion) - Hidden if stable or no missions */}
                 {!isSystemStable && !isNoMissionsFallback && (
                    <button
                        onClick={() => completeMission(activeMission)}
                        className="w-full bg-white text-slate-400 font-bold text-sm py-4 px-6 rounded-2xl border-2 border-slate-100 hover:border-slate-300 hover:text-slate-600 active:scale-95 transition-all flex items-center justify-center gap-2"
                        aria-label="Mark mission as accomplished"
                    >
                        <Check size={18} />
                        <span>Mission Accomplished</span>
                    </button>
                 )}
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
      </div>
    </div>
  );
};

export default Missions;