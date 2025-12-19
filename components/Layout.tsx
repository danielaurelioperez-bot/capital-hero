import React, { useState, useEffect } from 'react';
import BottomNav from './BottomNav';
import MoneySheet from './MoneySheet';
import { Plus, CheckCircle2, RotateCcw, ArrowRightLeft, X } from 'lucide-react';
import { useFinance } from '../hooks/useFinance';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const {
    recentAction,
    impactMsg,
    xp,
    isSheetOpen,
    openSheet,
    closeSheet,
    sheetView,
    canUndo,
    undoLastAction,
    lastWithdrawalForSpending,
    snapshot,
    sheetPayload,
  } = useFinance();

  const [showToast, setShowToast] = useState(false);
  const [showReturnPrompt, setShowReturnPrompt] = useState(false);

  useEffect(() => {
    if (recentAction) {
      setShowToast(true);
      const timer = setTimeout(() => setShowToast(false), 4000);
      return () => clearTimeout(timer);
    }
  }, [recentAction]);

  useEffect(() => {
    if (lastWithdrawalForSpending && snapshot.availableBalance > 0) {
      setShowReturnPrompt(true);
    } else {
      setShowReturnPrompt(false);
    }
  }, [lastWithdrawalForSpending, snapshot.availableBalance]);

  const getSourceFundName = () => {
    if (!lastWithdrawalForSpending) return 'fund';
    if (lastWithdrawalForSpending.sourceFundId === 'emergency') return 'Emergency Fund';
    const goal = snapshot.goals.find((g) => g.id === lastWithdrawalForSpending.sourceFundId);
    return goal ? goal.name : 'a Goal';
  };

  const handleReturnUnusedCash = () => {
    if (lastWithdrawalForSpending) {
      openSheet('return_unused_cash');
      setShowReturnPrompt(false);
    }
  };

  const handleDismissReturnPrompt = () => {
    setShowReturnPrompt(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex justify-center">
      {/* 
        Contenedor "teléfono": relative es CLAVE para que los elementos absolute
        (el + y el prompt) se posicionen dentro del teléfono, no de toda la pantalla.
      */}
      <div className="w-full max-w-md sm:max-w-2xl lg:max-w-4xl bg-white shadow-2xl relative overflow-hidden sm:rounded-2xl sm:border border-slate-100">
        {/* Global Impact Toast */}
        {showToast && (
          <div className="absolute top-4 left-0 right-0 z-[60] flex justify-center animate-in fade-in slide-in-from-top-4 duration-300 pointer-events-none">
            <div className="bg-slate-800 text-white pl-4 pr-2 py-2 rounded-full shadow-2xl flex items-center gap-3 border border-slate-700 max-w-[95%] pointer-events-auto">
              <div className="bg-[#22be54] rounded-full p-1 shrink-0">
                <CheckCircle2 size={16} className="text-white" strokeWidth={3} />
              </div>

              <div className="flex-1 mr-2">
                <span className="block text-sm font-bold text-white leading-tight">
                  {impactMsg || 'Action Logged!'}
                </span>
              </div>

              {canUndo && (
                <button
                  onClick={() => {
                    undoLastAction();
                    setShowToast(false);
                  }}
                  className="bg-slate-700 hover:bg-slate-600 text-slate-200 px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1 transition-colors border border-slate-600"
                  aria-label="Undo last action"
                >
                  <RotateCcw size={12} />
                  Undo
                </button>
              )}
            </div>
          </div>
        )}

        {/* Main content */}
        <main className="min-h-screen overflow-y-auto pb-32 px-6 pt-8 bg-white no-scrollbar">
          {children}
        </main>

        {/* Floating Action Button (ABSOLUTE para que quede dentro del contenedor) */}
        <div className="absolute bottom-[84px] left-0 right-0 flex justify-center z-40 pointer-events-none">
          <button
            onClick={() => openSheet('menu')}
            className="h-16 w-16 bg-[#492582] rounded-full text-white shadow-lg shadow-purple-300 flex items-center justify-center border-4 border-white active:scale-95 transition-transform pointer-events-auto"
            aria-label="Open money menu"
          >
            <Plus size={32} strokeWidth={3} />
          </button>
        </div>

        {/* Return unused cash prompt (ABSOLUTE para que quede dentro del contenedor) */}
        {showReturnPrompt && lastWithdrawalForSpending && (
          <div className="absolute bottom-[160px] left-0 right-0 z-50 flex justify-center animate-in fade-in slide-in-from-bottom-4 duration-300 pointer-events-none">
            <div className="bg-indigo-600 text-white p-4 rounded-xl shadow-lg flex flex-col gap-3 max-w-[95%] pointer-events-auto border-b-4 border-indigo-700">
              <div className="flex justify-between items-start">
                <p className="text-sm font-bold leading-tight">
                  You withdrew ${lastWithdrawalForSpending.initialAmount.toLocaleString()} from{' '}
                  {getSourceFundName()}.<br />
                  You now have ${snapshot.availableBalance.toLocaleString()} in Available Balance.
                </p>

                <button
                  onClick={handleDismissReturnPrompt}
                  className="p-1 rounded-full text-indigo-200 hover:bg-indigo-500 transition-colors -mr-2 -mt-2"
                  aria-label="Dismiss prompt"
                >
                  <X size={16} />
                </button>
              </div>

              <button
                onClick={handleReturnUnusedCash}
                className="w-full bg-white text-indigo-800 font-bold text-sm py-2 rounded-lg shadow-sm active:scale-95 transition-transform flex items-center justify-center gap-2"
                aria-label="Return unused portion to original fund"
              >
                <ArrowRightLeft size={16} />
                <span>Return Unused Cash</span>
              </button>
            </div>
          </div>
        )}

        {/* Bottom navigation */}
        <BottomNav />

        {/* Money sheet */}
        {isSheetOpen && (
          <MoneySheet
            isOpen={isSheetOpen}
            onClose={closeSheet}
            initialView={sheetView}
            initialPayload={sheetPayload}
          />
        )}
      </div>
    </div>
  );
};

export default Layout;
