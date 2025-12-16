import React, { useState, useEffect } from 'react';
import { X, Check, ShieldCheck, Target, DollarSign, Wallet } from 'lucide-react';
import { TransactionType, IncomeCategory, ExpenseCategory, Transaction } from '../hooks/useFinance';
import { useFinance } from '../hooks/useFinance'; // Import useFinance to get snapshot.goals

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  initialType?: TransactionType;
  initialData?: Transaction | null;
}

const TransactionModal: React.FC<TransactionModalProps> = ({ isOpen, onClose, onSave, initialType = 'expense', initialData }) => {
  const { snapshot } = useFinance(); // Use snapshot to get goals and emergency fund
  
  const [type, setType] = useState<TransactionType>(initialType);
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<string>('');
  const [note, setNote] = useState('');
  const [recurring, setRecurring] = useState(false);
  const [sourceFundId, setSourceFundId] = useState<string | null>(null); // New state for source fund

  // Sync state when modal opens or initialData changes
  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setType(initialData.type);
        setAmount(initialData.amount.toString());
        setCategory(initialData.category);
        setNote(initialData.note || '');
        setRecurring(initialData.recurring);
        setSourceFundId(initialData.sourceFundId || null); // Load source fund
      } else {
        // Reset defaults for new entry
        setType(initialType);
        setAmount('');
        setCategory('');
        setNote('');
        setRecurring(false);
        setSourceFundId(null); // Reset source fund
      }
    }
  }, [isOpen, initialData, initialType]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !category) return;
    
    const numAmount = parseFloat(amount);
    
    // Client-side validation for source fund amounts
    if (type === 'expense') {
        let maxAvailable = snapshot.availableBalance; // Default for available cash

        if (sourceFundId === 'emergency') {
            maxAvailable = snapshot.emergencyFund;
        } else if (sourceFundId) {
            const goal = snapshot.goals.find(g => g.id === sourceFundId);
            maxAvailable = goal ? goal.allocatedAmount : 0;
        }

        if (numAmount > maxAvailable || numAmount <= 0) {
            // Error handling already in place visually, but prevent save
            return;
        }
    }

    onSave({
      amount: numAmount,
      type,
      category,
      note,
      recurring,
      date: initialData ? initialData.date : new Date().toISOString(), // Keep original date if editing
      sourceFundId: type === 'expense' ? sourceFundId : undefined // Only apply sourceFundId for expenses
    });
    onClose();
  };

  const expenseCategories: ExpenseCategory[] = ['Essentials', 'Non-essentials', 'Debt', 'Savings', 'Toxic'];
  const incomeCategories: IncomeCategory[] = ['Salary', 'Freelance', 'Bonus', 'Other'];

  // Map display labels
  const getCategoryLabel = (cat: string) => {
      if (cat === 'Toxic') return 'Impulse';
      if (cat === 'Non-essentials') return 'Lifestyle';
      return cat;
  };

  // Determine max amount for validation display
  let currentMaxAvailable = snapshot.availableBalance;
  if (sourceFundId === 'emergency') {
      currentMaxAvailable = snapshot.emergencyFund;
  } else if (sourceFundId) {
      const goal = snapshot.goals.find(g => g.id === sourceFundId);
      currentMaxAvailable = goal ? goal.allocatedAmount : 0;
  }
  const currentAmountValue = parseFloat(amount || '0');
  const isAmountError = currentAmountValue > currentMaxAvailable || currentAmountValue <= 0;

  const activeGoals = snapshot.goals.filter(g => g.status === 'active');

  return (
    <div className="fixed inset-0 bg-black/50 z-[100] flex items-end sm:items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl animate-in slide-in-from-bottom-10 duration-200">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-black text-slate-800">{initialData ? 'Edit Entry' : 'Add Entry'}</h2>
          <button onClick={onClose} className="p-2 bg-slate-100 rounded-full hover:bg-slate-200" aria-label="Close transaction modal">
            <X size={20} className="text-slate-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Type Selector */}
          <div className="flex p-1 bg-slate-100 rounded-xl">
            <button
              type="button"
              onClick={() => { setType('expense'); setSourceFundId(null); }} // Reset source fund on type change
              className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${type === 'expense' ? 'bg-white text-rose-500 shadow-sm' : 'text-slate-400'}`}
              aria-label="Select expense type"
            >
              Expense
            </button>
            <button
              type="button"
              onClick={() => { setType('income'); setSourceFundId(null); }} // Reset source fund on type change
              className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${type === 'income' ? 'bg-white text-[#22be54] shadow-sm' : 'text-slate-400'}`}
              aria-label="Select income type"
            >
              Income
            </button>
          </div>

          <div>
            <label htmlFor="amount" className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Amount</label>
            <input
              id="amount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className={`w-full text-3xl font-black placeholder:text-slate-200 focus:outline-none ${isAmountError ? 'text-rose-500' : 'text-slate-800'}`}
              autoFocus
            />
            {type === 'expense' && (
                <div className="text-xs font-bold text-slate-400 mt-1">
                    {sourceFundId === 'emergency' ? 'In Emergency Fund' : sourceFundId ? 'In Goal' : 'Available Cash'}: ${currentMaxAvailable.toLocaleString()}
                </div>
            )}
            {isAmountError && currentAmountValue > 0 && (
                <p className="text-xs font-bold text-rose-500 mt-1">
                    Not enough funds in the selected source.
                </p>
            )}
            {isAmountError && currentAmountValue <= 0 && amount !== '' && (
                <p className="text-xs font-bold text-rose-500 mt-1">
                    Amount must be greater than zero.
                </p>
            )}
          </div>

          {/* New: Source Fund Selector for Expenses */}
          {type === 'expense' && (
            <div>
              <label htmlFor="source-fund" className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Debit from</label>
              <div className="flex flex-wrap gap-2">
                <button
                  key="available"
                  type="button"
                  onClick={() => setSourceFundId(null)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border-2 transition-all ${
                    sourceFundId === null
                      ? 'border-[#492582] bg-[#492582] text-white' 
                      : 'border-slate-200 text-slate-500 hover:border-slate-300'
                  }`}
                  aria-label="Debit from available cash"
                >
                  <Wallet size={12} className="inline-block mr-1" /> Available Cash
                </button>
                <button
                  key="emergency"
                  type="button"
                  onClick={() => setSourceFundId('emergency')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border-2 transition-all ${
                    sourceFundId === 'emergency'
                      ? 'border-amber-500 bg-amber-500 text-white' 
                      : 'border-slate-200 text-slate-500 hover:border-slate-300'
                  }`}
                  aria-label="Debit from emergency fund"
                >
                  <ShieldCheck size={12} className="inline-block mr-1" /> Emergency
                </button>
                {activeGoals.map((goal) => (
                  <button
                    key={goal.id}
                    type="button"
                    onClick={() => setSourceFundId(goal.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border-2 transition-all ${
                        sourceFundId === goal.id
                        ? 'border-indigo-500 bg-indigo-500 text-white'
                        : 'border-slate-200 text-slate-500 hover:border-slate-300'
                    }`}
                    aria-label={`Debit from goal: ${goal.name}`}
                  >
                    <Target size={12} className="inline-block mr-1" /> {goal.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <label htmlFor="category" className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Category</label>
            <div className="flex flex-wrap gap-2">
              {(type === 'expense' ? expenseCategories : incomeCategories).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border-2 transition-all ${
                    category === cat 
                      ? 'border-[#492582] bg-[#492582] text-white' 
                      : 'border-slate-200 text-slate-500 hover:border-slate-300'
                  }`}
                  aria-label={`Select category ${getCategoryLabel(cat)}`}
                >
                  {getCategoryLabel(cat)}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="note" className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Note (Optional)</label>
            <input
              id="note"
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="What was this for?"
              className="w-full p-3 bg-slate-50 rounded-xl font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            />
          </div>

          <label htmlFor="recurring" className="flex items-center gap-3 py-2">
            <input
              id="recurring"
              type="checkbox"
              checked={recurring}
              onChange={(e) => setRecurring(e.target.checked)}
              className="w-5 h-5 rounded-md text-[#492582] focus:ring-[#492582]"
            />
            <span className="text-sm font-bold text-slate-600">Recurring Monthly?</span>
          </label>

          <button
            type="submit"
            disabled={isAmountError || !amount || !category} // Disable if amount is invalid or fields are empty
            className="w-full bg-[#492582] disabled:bg-slate-300 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition-transform"
            aria-label={initialData ? 'Update transaction' : 'Save transaction'}
          >
            <Check size={20} />
            <span>{initialData ? 'Update Entry' : 'Save Entry'}</span>
          </button>
        </form>
      </div>
    </div>
  );
};

export default TransactionModal;