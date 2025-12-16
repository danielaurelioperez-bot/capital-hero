import React from 'react';
import { Link } from 'react-router-dom';
import { Target, ShieldCheck, ArrowRight, AlertTriangle, CalendarClock, Zap, Database, ShieldAlert, RefreshCw, Sparkles, TrendingUp, CheckCircle2, Lock, X } from 'lucide-react';
import { useFinance } from '../hooks/useFinance';
import { MissionIconType, MissionColor } from '../finance/missions';
import { CharacterPortrait } from '../components/PixelAvatars';

const Home: React.FC = () => {
  const { summary, snapshot, activeMission, daysOffline, skipMission, openSheet } = useFinance(); // Added openSheet

  const getStatusIcon = () => {
    if (summary.status === 'Stable') return <ShieldCheck className="text-[#22be54]" size={24} />;
    if (summary.status === 'In Trouble') return <AlertTriangle className="text-rose-500" size={24} />;
    return <ShieldCheck className="text-amber-500" size={24} />;
  };

  // Helper to render icons based on string name
  const renderIcon = (name: MissionIconType, colorClass: string) => {
    const props = { className: colorClass, size: 32 };
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
      case 'indigo': return { bg: 'bg-indigo-50', border: 'border-indigo-100', iconBg: 'bg-indigo-100', iconText: 'text-indigo-600', btn: 'bg-[#492582]', btnBorder: 'border-[#351a60]' };
      case 'green': return { bg: 'bg-green-50', border: 'border-green-100', iconBg: 'bg-green-100', iconText: 'text-green-600', btn: 'bg-green-500', btnBorder: 'border-green-600' };
      case 'rose': return { bg: 'bg-rose-50', border: 'border-rose-100', iconBg: 'bg-rose-100', iconText: 'text-rose-600', btn: 'bg-rose-500', btnBorder: 'border-rose-600' };
      case 'amber': return { bg: 'bg-amber-50', border: 'border-amber-100', iconBg: 'bg-amber-100', iconText: 'text-amber-600', btn: 'bg-amber-500', btnBorder: 'border-amber-600' };
      case 'slate': return { bg: 'bg-slate-50', border: 'border-slate-100', iconBg: 'bg-slate-100', iconText: 'text-slate-400', btn: 'bg-slate-700', btnBorder: 'border-slate-800' };
      default: return { bg: 'bg-indigo-50', border: 'border-indigo-100', iconBg: 'bg-indigo-100', iconText: 'text-indigo-600', btn: 'bg-[#492582]', btnBorder: 'border-[#351a60]' };
    }
  };

  // Contextual Mentor Copy Engine (Humanized)
  const getHeroMessage = () => {
    // 1. Re-engagement Override (Highest Priority)
    if (daysOffline >= 2) return "Welcome back. Let's quickly verify your numbers still match reality.";

    // 2. Active Mission Prompt (Directing focus)
    // If a specific mission is active and not 'system_stable' or 'no_missions_yet', its description is the most relevant advice.
    if (activeMission.id !== 'system_stable' && activeMission.id !== 'no_missions_yet') {
      return activeMission.desc;
    }

    // 3. Fallback to status-based advice only if no critical mission is active ('system_stable' is active)
    switch (summary.status) {
      case 'Stable':
        if (snapshot.emergencyFund < 500) { // Example threshold for a 'good' emergency fund start
          return "You're stable! Let's grow that emergency fund for better peace of mind. Target a few months of expenses.";
        }
        if (snapshot.unallocatedSavings > 100 && snapshot.goals.filter(g => g.status === 'active').length === 0) {
          return `You have $${snapshot.unallocatedSavings.toLocaleString()} waiting. Let's define some exciting goals to put it towards!`;
        }
        if (snapshot.unallocatedSavings > 50) {
          return `You're doing great! You have $${snapshot.unallocatedSavings.toLocaleString()} ready to be allocated to your goals or emergency fund.`;
        }
        return "You're in an excellent financial position! Keep up the smart work, and explore advanced wealth-building strategies.";

      case 'At Risk':
        if (summary.net < -50) { // Significantly negative monthly net flow
          return "Your monthly spending is notably exceeding your income. Let's review your recent expenses to find areas to adjust.";
        }
        if (snapshot.runwayDays < 30) {
          return "Your financial runway is shorter than ideal. Prioritize essential spending and watch for unnecessary leaks.";
        }
        return "Things are a bit tight this month. Focus on being mindful with every purchase, and avoid any surprises.";

      case 'In Trouble':
        return "Critical situation detected. Immediately pause all non-essential spending. We need to stabilize your cash flow and identify immediate cuts.";
      
      default:
        return "Keep track of your finances to master your money. I'm here to help!"; // Default generic message
    }
  };

  const renderPriorityCard = () => {
    const theme = getThemeStyles(activeMission.color);
    const isStable = activeMission.id === 'system_stable';
    const isNoMissionsFallback = activeMission.id === 'no_missions_yet';

    const handleMissionAction = () => {
      if (activeMission.actionView) {
        openSheet(activeMission.actionView);
      } else if (activeMission.actionPath) {
        // Link component handles navigation, so this path is for `button` click if no actionView
        // This case might only happen if actionPath is set but it's not a Link, which isn't current pattern
      }
    };
    
    return (
        <div className={`${theme.bg} rounded-3xl border-2 ${theme.border} p-6 shadow-sm mx-1 mt-2 transition-all`}>
            <div className="flex flex-col items-center text-center mb-6">
                <div className={`${theme.iconBg} p-3 rounded-2xl mb-4`}>
                    {renderIcon(activeMission.iconName, theme.iconText)}
                </div>
                <span className={`text-[10px] font-black uppercase tracking-widest mb-2 opacity-60`}>
                    {isStable ? 'Status' : (isNoMissionsFallback ? 'Current Status' : 'Next Move')}
                </span>
                <h3 className="text-2xl font-black text-slate-800 mb-1">{activeMission.title}</h3>
                <p className="text-slate-500 font-bold text-sm px-2 leading-relaxed">
                    {activeMission.desc}
                </p>
            </div>
            <div className="w-full flex flex-col gap-3"> {/* Container for buttons */}
                {activeMission.actionPath ? (
                    <Link 
                        to={activeMission.actionPath}
                        className={`w-full ${theme.btn} text-white font-bold text-lg py-4 px-6 rounded-2xl border-b-4 ${theme.btnBorder} active:border-b-0 active:translate-y-1 transition-all flex items-center justify-center gap-2`}
                    >
                        <span>{activeMission.actionLabel}</span>
                        {(activeMission.showArrow === undefined || activeMission.showArrow) && <ArrowRight size={20} />}
                    </Link>
                ) : activeMission.actionView ? (
                     <button
                        onClick={handleMissionAction}
                        className={`w-full ${theme.btn} text-white font-bold text-lg py-4 px-6 rounded-2xl border-b-4 ${theme.btnBorder} active:border-b-0 active:translate-y-1 transition-all flex items-center justify-center gap-2`}
                     >
                        <span>{activeMission.actionLabel}</span>
                        {(activeMission.showArrow === undefined || activeMission.showArrow) && <ArrowRight size={20} />}
                    </button>
                ) : (
                    <button
                        disabled
                        className="w-full bg-slate-100 text-slate-400 font-bold text-lg py-4 px-6 rounded-2xl border-2 border-slate-200 cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        <span>No Action Available</span>
                        <Lock size={20} />
                    </button>
                )}
                
                {/* Dismiss button only for active/stable missions, not for the 'no missions' fallback */}
                {!isNoMissionsFallback && (
                    <button
                        onClick={() => skipMission(activeMission)}
                        className="w-full bg-white text-slate-400 font-bold text-sm py-3 px-6 rounded-2xl border-2 border-slate-100 hover:border-slate-300 hover:text-slate-600 active:scale-95 transition-all flex items-center justify-center gap-2"
                        aria-label="Dismiss mission"
                    >
                        <X size={14} />
                        <span>Not right now</span>
                    </button>
                )}
            </div>
        </div>
    );
  };

  return (
    <div className="space-y-6 pt-2 pb-8 relative">
      {/* AI Mentor Presence - Modern Bubble with Humanoid Avatar */}
      <div className="flex items-end space-x-3 px-2">
        <div className="relative shrink-0 -mb-1">
             <CharacterPortrait character="ari" size={64} popOut={12} className="drop-shadow-sm" />
        </div>
        <div className="bg-white rounded-3xl rounded-bl-none p-5 border-2 border-slate-200 flex-1 shadow-sm relative">
            <p className="text-slate-700 text-sm font-bold leading-relaxed">
            "{getHeroMessage()}"
            </p>
            {/* Speech Bubble Arrow */}
            <div className="absolute bottom-0 -left-2 w-4 h-4 bg-white border-b-2 border-l-2 border-slate-200 transform skew-x-12"></div>
        </div>
      </div>

      {/* Dynamic Mission Card */}
      {renderPriorityCard()}

      {/* Status Overview (Duolingo Style Metrics) */}
      <div className="grid grid-cols-2 gap-3 px-1">
        {/* Metric 1: Financial Health */}
        <div className="bg-white rounded-2xl border-b-4 border-2 border-slate-200 p-4 flex flex-col items-center text-center gap-2 active:border-b-2 active:translate-y-0.5 transition-all cursor-default">
            {getStatusIcon()}
            <div>
                <h3 className="text-sm font-black text-slate-800">{snapshot.status}</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Health</p>
            </div>
        </div>

        {/* Metric 2: Runway / Safety */}
        <div className="bg-white rounded-2xl border-b-4 border-2 border-slate-200 p-4 flex flex-col items-center text-center gap-2 active:border-b-2 active:translate-y-0.5 transition-all cursor-default">
            <CalendarClock className="text-indigo-500" size={24} />
            <div>
                <h3 className="text-sm font-black text-slate-800 line-clamp-1">
                    {snapshot.coveredUntil === 'Unknown' ? '--' : snapshot.coveredUntil}
                </h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Runway</p>
            </div>
        </div>
        
        {/* Metric 3: Safe Spending (Positive Framing) */}
         <div className="col-span-2 bg-[#492582] rounded-2xl border-b-4 border-2 border-[#351a60] p-4 flex items-center justify-between shadow-lg shadow-purple-200">
            <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2 rounded-xl">
                    <Sparkles className="text-yellow-300" size={20} />
                </div>
                <div className="text-left">
                    <h3 className="text-white font-black text-lg">
                        ${summary.weeklySafeSpend - summary.weeklyNonEssential}
                    </h3>
                    <p className="text-purple-200 text-[10px] font-bold uppercase tracking-wide">
                        Safe to Spend This Week
                    </p>
                </div>
            </div>
            <TrendingUp className="text-purple-300 opacity-50" size={24} />
        </div>
      </div>
    </div>
  );
};

export default Home;