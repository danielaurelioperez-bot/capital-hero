import React, { useState } from 'react';
import { ArrowLeft, Plus, Trash2, Repeat, Edit2, Shield, Zap, Sparkles, Info } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useFinance, Transaction } from '../hooks/useFinance';
import TransactionModal from '../components/TransactionModal';
import { CharacterPortrait } from '../components/PixelAvatars';

const Finances: React.FC = () => {
  const { incomes, expenses, deleteTransaction, addTransaction, editTransaction, summary, openSheet } = useFinance();
  const [activeTab, setActiveTab] = useState<'income' | 'expense'>('income');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [dismissedRecurringWarning, setDismissedRecurringWarning] = useState(false);

  const transactions = activeTab === 'income' ? incomes : expenses;

  // Safe Spending Calculation
  const safeCapacity = summary.weeklySafeSpend;
  const safeUsed = summary.weeklyNonEssential;
  const safeRemaining = Math.max(0, safeCapacity - safeUsed);
  const guardrailPercent = safeCapacity > 0 ? (safeUsed / safeCapacity) * 100 : 0;

  // Check if any recurring expenses exist
  const hasRecurringExpenses = expenses.some((t) => t.recurring);

  const handleEdit = (tx: Transaction) => {
    setEditingTx(tx);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingTx(null);
  };

  const handleSave = (data: Omit<Transaction, 'id'>) => {
    if (editingTx) {
      editTransaction({ ...data, id: editingTx.id });
    } else {
      addTransaction(data);
    }
  };

  const renderEmptyState = (type: 'income' | 'expense') => (
    <div className="text-center py-12 flex flex-col items-center justify-center text-slate-300 border-2 border-dashed border-slate-100 rounded-3xl bg-white space-y-4">
      <CharacterPortrait character="ari" size={80} popOut={12} className="drop-shadow-md" />
      <p className="font-black text-sm text-slate-600">It's quiet in here...</p>
      <p className="text-xs font-medium text-slate-400 w-full min-w-0 break-words">
        Let's add your first {type} and start tracking your financial flow.
      </p>
      <button
        onClick={() => setIsModalOpen(true)}
        className={`w-full sm:w-[85%] lg:w-full py-3 rounded-xl text-sm font-bold text-white shadow-lg active:scale-95 transition-transform mt-4 
                        ${type === 'income' ? 'bg-green-600 border-b-4 border-green-700' : 'bg-rose-600 border-b-4 border-rose-700'}`}
        aria-label={`Add ${type} now`}
      >
        <Plus size={16} className="inline-block mr-2" /> Add {type === 'income' ? 'Income' : 'Expense'} Now
      </button>
    </div>
  );

  return (
    <div className="w-full min-w-0 pb-8 space-y-6 pt-2 px-2 sm:px-4">
      {/* Header */}
      <div className="flex items-center gap-4 px-2">
        <Link
          to="/settings"
          className="p-2 bg-slate-100 rounded-xl text-slate-500 hover:bg-slate-200 border-b-4 border-transparent active:border-b-0 active:translate-y-0.5 transition-all"
          aria-label="Go back to settings"
        >
          <ArrowLeft size={24} />
        </Link>
        <h1 className="text-2xl font-black text-slate-800">Wallet</h1>
      </div>

      {/* Monthly Summary Card - Level Style */}
      <div className="w-full rounded-3xl bg-slate-900 p-6 text-white shadow-xl relative overflow-hidden border-b-8 border-slate-800">
        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>

        <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Monthly Net Flow</div>
        <div className="flex justify-between items-end mb-6 relative z-10">
          <div>
            <div className="text-4xl font-black tracking-tight">${summary.net.toLocaleString()}</div>
            <div className="text-sm font-bold text-slate-400">Balance Increase</div>
          </div>
          <div
            className={`px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wide ${
              summary.net >= 0 ? 'bg-green-500 text-slate-900' : 'bg-rose-500 text-white'
            }`}
          >
            {summary.net >= 0 ? 'Surplus' : 'Deficit'}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-800 relative z-10">
          <div>
            <div className="text-lg font-black text-[#22be54]">+${summary.totalIncome.toLocaleString()}</div>
            <div className="text-[10px] text-slate-500 font-bold uppercase">In</div>
          </div>
          <div>
            <div className="text-lg font-black text-rose-400">-${summary.totalExpenses.toLocaleString()}</div>
            <div className="text-[10px] text-slate-500 font-bold uppercase">Out</div>
          </div>
        </div>
      </div>

      {/* Safe Spending / Guardrail */}
      <div className="w-full bg-white rounded-3xl border-2 border-slate-200 p-6 shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <div className="bg-[#492582] p-1.5 rounded-lg">
              <Sparkles size={14} className="text-yellow-300" />
            </div>
            <h3 className="text-sm font-black text-slate-800">Safe Spending</h3>
          </div>
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Weekly</span>
        </div>

        <div className="flex items-end gap-2 mb-3">
          <span className="text-3xl font-black text-slate-800">${safeRemaining}</span>
          <span className="text-sm font-bold text-slate-400 mb-1.5">left to enjoy</span>
        </div>

        {/* Custom Progress Bar */}
        <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200">
          <div
            className={`h-full rounded-full transition-all ${guardrailPercent > 100 ? 'bg-rose-500' : 'bg-[#22be54]'}`}
            style={{ width: `${guardrailPercent > 100 ? 100 : guardrailPercent}%` }}
          ></div>
        </div>

        <p className="text-xs font-bold text-slate-400 mt-3 leading-relaxed">
          {guardrailPercent > 100
            ? 'Stop. You have exceeded your safe margin.'
            : 'Spending from here does not put your bills at risk.'}
        </p>
      </div>

      {/* WARNING CARD: No Recurring Bills Logged */}
      {!hasRecurringExpenses && !dismissedRecurringWarning && (
        <div className="w-full bg-amber-50 border-2 border-amber-200 p-6 rounded-3xl shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-start gap-4 mb-4">
            <Info size={24} className="text-amber-600 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-lg font-black text-amber-800 mb-1">Heads Up: Bills Missing?</h3>
              <p className="text-sm font-medium text-amber-700 leading-relaxed">
                Your "Safe to Spend" is calculated based on known recurring bills. Please ensure all your regular payments
                (rent, subscriptions, loans) are logged for accurate advice.
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <button
              onClick={() => {
                openSheet('regular');
              }}
              className="w-full bg-amber-600 text-white font-bold text-sm py-3 rounded-xl shadow-lg active:scale-95 transition-transform border-b-4 border-amber-700"
              aria-label="Add a regular payment"
            >
              <Plus size={16} className="inline-block mr-2" /> Add a Regular Payment
            </button>
            <button
              onClick={() => setDismissedRecurringWarning(true)}
              className="w-full bg-white text-slate-500 font-bold text-sm py-3 rounded-xl border-2 border-slate-200 hover:border-slate-300 active:scale-95 transition-transform"
              aria-label="Dismiss warning, I've logged everything"
            >
              I've logged everything
            </button>
          </div>
        </div>
      )}

      {/* Transaction List */}
      <div className="space-y-4">
        {/* Toggle Tabs */}
        <div className="flex p-1 bg-slate-100 rounded-2xl w-full">
          <button
            onClick={() => setActiveTab('income')}
            className={`flex-1 py-3 rounded-xl text-sm font-black uppercase tracking-wider transition-all ${
              activeTab === 'income' ? 'bg-white text-[#22be54] shadow-sm' : 'text-slate-400 hover:text-slate-500'
            }`}
            aria-label="Show income transactions"
          >
            Income
          </button>
          <button
            onClick={() => setActiveTab('expense')}
            className={`flex-1 py-3 rounded-xl text-sm font-black uppercase tracking-wider transition-all ${
              activeTab === 'expense' ? 'bg-white text-rose-500 shadow-sm' : 'text-slate-400 hover:text-slate-500'
            }`}
            aria-label="Show spending transactions"
          >
            Spending
          </button>
        </div>

        <div className="space-y-3 min-h-[200px] px-2 sm:px-4">
          {transactions.length === 0 ? (
            renderEmptyState(activeTab)
          ) : (
            transactions.map((t) => (
              <div
                key={t.id}
                className="bg-white border-b-4 border-2 border-slate-200 rounded-2xl p-4 flex justify-between items-center group active:border-b-2 active:translate-y-0.5 transition-all"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div
                    className={`p-3 rounded-xl ${
                      activeTab === 'income' ? 'bg-green-100 text-green-600' : 'bg-rose-100 text-rose-600'
                    }`}
                  >
                    {activeTab === 'income' ? <Shield size={20} /> : <Zap size={20} />}
                  </div>
                  <div className="min-w-0">
                    <div className="font-black text-slate-700 text-sm truncate">
                      {t.category === 'Toxic'
                        ? 'Impulse Buy'
                        : t.category === 'Non-essentials'
                          ? 'Lifestyle'
                          : t.category}
                    </div>
                    <div className="text-xs font-bold text-slate-400 flex items-center gap-1 min-w-0 truncate">
                      {t.recurring && <Repeat size={10} />}
                      {t.note || 'No note'}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-black text-slate-800 text-lg">${t.amount}</span>
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleEdit(t)}
                      className="p-2 text-slate-300 hover:text-[#492582] hover:bg-indigo-50 rounded-lg transition-colors"
                      aria-label={`Edit transaction ${t.note || t.category}`}
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => deleteTransaction(t.id, activeTab)}
                      className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                      aria-label={`Delete transaction ${t.note || t.category}`}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ✅ Floating Add Button (anchored to the app width, not the viewport) */}
      <div className="sticky bottom-24 z-40 flex justify-end px-2 sm:px-4">
        <button
          onClick={() => setIsModalOpen(true)}
          className="h-16 w-16 bg-[#492582] rounded-2xl text-white shadow-lg shadow-purple-300 flex items-center justify-center border-b-4 border-[#351a60] active:border-b-0 active:translate-y-1 transition-all"
          aria-label="Add new transaction"
        >
          <Plus size={32} strokeWidth={3} />
        </button>
      </div>

      <TransactionModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSave={handleSave}
        initialType={activeTab}
        initialData={editingTx}
      />
    </div>
  );
};

export default Finances;
