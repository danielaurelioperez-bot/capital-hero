import React, { useState, useEffect } from 'react';
import { X, ArrowLeft, ArrowRightLeft, ShieldCheck, Lock, ChevronRight, Check, DollarSign, Calendar, Shield, Zap, Target, Info, Wallet, ListChecks } from 'lucide-react';
import { useFinance, IncomeCategory, ExpenseCategory, PaymentFrequency, Irregularity, Transaction, TransactionDraft } from '../hooks/useFinance';
import { SheetView } from '../finance/storage';
import DraftList from './DraftList';
import TransactionModal from './TransactionModal';

interface MoneySheetProps {
  isOpen: boolean;
  onClose: () => void;
  initialView?: SheetView;
  initialPayload?: any;
}

const MoneySheet: React.FC<MoneySheetProps> = ({ isOpen, onClose, initialView = 'menu', initialPayload }) => {
  const {
    addTransaction,
    snapshot,
    moveToSavings,
    moveToEmergency,
    withdrawFromSavings,
    withdrawFromEmergency,
    initiateWithdrawalForSpending, // NEW
    returnUnusedCash, // NEW
    lastWithdrawalForSpending, // NEW
    drafts,
    confirmDraft,
    confirmAllDrafts,
    markDraftStatus,
    updateDraft,
  } = useFinance();
  const [view, setView] = useState<SheetView>(initialView);

  // Form State
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [date, setDate] = useState('');
  const [recurring, setRecurring] = useState(false);
  const [frequency, setFrequency] = useState<PaymentFrequency>('monthly');
  const [irregularity, setIrregularity] = useState<Irregularity | undefined>(undefined);
  const [category, setCategory] = useState<string>('');
  
  // Transfer State
  const [transferTarget, setTransferTarget] = useState<'savings' | 'emergency'>('savings');
  const [transferDirection, setTransferDirection] = useState<'deposit' | 'withdraw'>('deposit'); // New state for deposit/withdraw

  // Withdraw for Spending State
  const [spendingSourceFundId, setSpendingSourceFundId] = useState<string | null>(null);

  // Draft editing state
  const [draftModalOpen, setDraftModalOpen] = useState(false);
  const [editingDraft, setEditingDraft] = useState<TransactionDraft | null>(null);

  // Initialize date to today on mount
  useEffect(() => {
    setDate(new Date().toISOString().split('T')[0]);
  }, []);

  // Update view when initialView changes (e.g., opened from Missions or Finances)
  useEffect(() => {
    if (isOpen) {
      setView(initialView);
      resetForm();
      // Apply defaults based on initialView
      if (initialView === 'income') setCategory('Salary');
      if (initialView === 'regular') {
        setCategory('Essentials'); // Default for regular payments
        setRecurring(true);
        setFrequency('monthly');
      }
      if (initialView === 'expense') setCategory('Non-essentials');
      if (initialView === 'transfer') {
        setTransferTarget('savings');
        setTransferDirection('deposit'); // Default to deposit for transfers
      }
      if (initialView === 'withdraw_for_spending') {
        setSpendingSourceFundId('emergency'); // Default to emergency for spending withdrawal
      }
      if (initialView === 'return_unused_cash' && lastWithdrawalForSpending) {
        setSpendingSourceFundId(lastWithdrawalForSpending.sourceFundId);
        setAmount(snapshot.availableBalance.toFixed(2)); // Pre-fill with available balance
      }
      // Apply incoming payload (prefill) if present
      if (initialPayload) {
        if (initialPayload.transfer) {
          const t = initialPayload.transfer;
          if (t.amount !== undefined) setAmount(String(t.amount));
          if (t.transferTarget) setTransferTarget(t.transferTarget);
          if (t.transferDirection) setTransferDirection(t.transferDirection);
        }
        if (initialPayload.withdraw) {
          const w = initialPayload.withdraw;
          if (w.sourceFundId) setSpendingSourceFundId(w.sourceFundId);
          if (w.amount !== undefined) setAmount(String(w.amount));
        }
        if (initialPayload.income) {
          const i = initialPayload.income;
          if (i.amount !== undefined) setAmount(String(i.amount));
          if (i.category) setCategory(i.category);
        }
      }
    }
  }, [isOpen, initialView, lastWithdrawalForSpending, snapshot.availableBalance]); // Add new dependencies

  // Reset view and form when closed
  useEffect(() => {
    if (!isOpen) {
      const timer = setTimeout(() => {
        setView('menu');
        resetForm();
        setDraftModalOpen(false);
        setEditingDraft(null);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const resetForm = () => {
    setAmount('');
    setNote('');
    setDate(new Date().toISOString().split('T')[0]);
    setRecurring(false);
    setFrequency('monthly');
    setIrregularity(undefined);
    setCategory('');
    setTransferTarget('savings');
    setTransferDirection('deposit'); // Reset transfer direction
    setSpendingSourceFundId(null); // Reset spending source fund
  };

  const handleDraftEdit = (draft: TransactionDraft) => {
    setEditingDraft(draft);
    setDraftModalOpen(true);
  };

  const handleDraftSave = (data: Omit<Transaction, 'id'>) => {
    if (!editingDraft) return;
    updateDraft(editingDraft.id, { ...editingDraft, ...data, status: 'pending' });
  };

  const handleViewChange = (newView: SheetView) => {
    setView(newView);
    resetForm();
    // Set smart defaults
    if (newView === 'income') setCategory('Salary');
    if (newView === 'regular') {
      setCategory('Essentials');
      setRecurring(true);
      setFrequency('monthly');
    }
    if (newView === 'expense') setCategory('Non-essentials');
    if (newView === 'transfer') {
      setTransferTarget('savings');
      setTransferDirection('deposit');
    }
    if (newView === 'withdraw_for_spending') {
      setSpendingSourceFundId('emergency');
    }
    if (newView === 'return_unused_cash' && lastWithdrawalForSpending) {
      setSpendingSourceFundId(lastWithdrawalForSpending.sourceFundId);
      setAmount(snapshot.availableBalance.toFixed(2));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount) return;
    const numAmount = parseFloat(amount);

    if (view === 'transfer') {
        if (numAmount <= 0) return; // Amount must be positive

        if (transferDirection === 'deposit') {
            if (numAmount > snapshot.availableBalance) return; // Client-side validation for deposit
            if (transferTarget === 'savings') moveToSavings(numAmount);
            else moveToEmergency(numAmount);
        } else { // withdraw
            if (transferTarget === 'savings') {
                if (numAmount > snapshot.unallocatedSavings) return; // Client-side validation for savings withdrawal
                withdrawFromSavings(numAmount);
            } else { // emergency
                if (numAmount > snapshot.emergencyFund) return; // Client-side validation for emergency withdrawal
                withdrawFromEmergency(numAmount);
            }
        }
    } else if (view === 'withdraw_for_spending') {
        if (spendingSourceFundId && initiateWithdrawalForSpending(spendingSourceFundId, numAmount)) {
          onClose();
        } else {
          // Error handling is inside initiateWithdrawalForSpending, might display toast
        }
    } else if (view === 'return_unused_cash') {
        if (returnUnusedCash(numAmount)) {
          onClose();
        } else {
          // Error handling inside returnUnusedCash
        }
    } else {
        const type = view === 'income' ? 'income' : 'expense';
        addTransaction({
            amount: numAmount,
            type,
            category: category as any,
            note,
            date: new Date(date).toISOString(),
            recurring: view === 'regular' ? true : recurring,
            frequency: view === 'regular' ? frequency : undefined,
            irregularity: view === 'regular' && frequency === 'irregular' ? irregularity : undefined
        });
    }

    onClose();
  };

  if (!isOpen) return null;

  const incomeCategories: IncomeCategory[] = ['Salary', 'Freelance', 'Bonus', 'Other'];
  const expenseCategories: ExpenseCategory[] = ['Essentials', 'Non-essentials', 'Toxic', 'Savings', 'Debt'];

  // Helper to map internal categories to display names
  const getCategoryLabel = (cat: string) => {
      if (cat === 'Toxic') return 'Impulse';
      if (cat === 'Non-essentials') return 'Lifestyle';
      return cat;
  };

  const renderMenu = () => (
    <div className="space-y-4 animate-in slide-in-from-bottom-8 duration-300">
      <h2 className="text-xl font-black text-slate-800 text-center mb-6">Select Action</h2>
      
      {/* Add Expense (Moved to top as most frequent) */}
      <button 
        onClick={() => handleViewChange('expense')}
        className="w-full bg-rose-50 border-2 border-rose-100 p-4 rounded-2xl flex items-center justify-between group active:scale-95 transition-transform"
        aria-label="Add new expense"
      >
        <div className="flex items-center gap-4">
          <div className="bg-rose-100 p-3 rounded-xl text-rose-600">
            <Zap size={24} />
          </div>
          <div className="text-left">
            <span className="block text-lg font-bold text-slate-800">Add Expense</span>
            <span className="text-xs font-medium text-slate-500">Food, transport, daily shopping</span>
          </div>
        </div>
        <ChevronRight className="text-rose-300 group-hover:text-rose-500 transition-colors" />
      </button>

      {/* Add Income */}
      <button 
        onClick={() => handleViewChange('income')}
        className="w-full bg-green-50 border-2 border-green-100 p-4 rounded-2xl flex items-center justify-between group active:scale-95 transition-transform"
        aria-label="Add new income"
      >
        <div className="flex items-center gap-4">
          <div className="bg-green-100 p-3 rounded-xl text-green-600">
            <Shield size={24} />
          </div>
          <div className="text-left">
            <span className="block text-lg font-bold text-slate-800">Add Income</span>
            <span className="text-xs font-medium text-slate-500">Salary, freelance, side gig</span>
          </div>
        </div>
        <ChevronRight className="text-green-300 group-hover:text-green-500 transition-colors" />
      </button>

      {/* Add a Regular Payment */}
      <button 
        onClick={() => handleViewChange('regular')}
        className="w-full bg-indigo-50 border-2 border-indigo-100 p-4 rounded-2xl flex items-center justify-between group active:scale-95 transition-transform"
        aria-label="Add a regular payment"
      >
        <div className="flex items-center gap-4">
          <div className="bg-indigo-100 p-3 rounded-xl text-indigo-600">
            <Target size={24} />
          </div>
          <div className="text-left">
            <span className="block text-lg font-bold text-slate-800">Add a Regular Payment</span>
            <span className="text-xs font-medium text-slate-500">Rent, subscriptions, loans</span>
          </div>
        </div>
        <ChevronRight className="text-indigo-300 group-hover:text-indigo-500 transition-colors" />
      </button>

      {/* Move Money */}
      <button 
        onClick={() => handleViewChange('transfer')}
        className="w-full bg-cyan-50 border-2 border-cyan-100 p-4 rounded-2xl flex items-center justify-between group active:scale-95 transition-transform"
        aria-label="Move money between accounts"
      >
        <div className="flex items-center gap-4">
          <div className="bg-cyan-100 p-3 rounded-xl text-cyan-600">
            <ArrowRightLeft size={24} />
          </div>
          <div className="text-left">
            <span className="block text-lg font-bold text-slate-800">Move Money</span>
            <span className="text-xs font-medium text-slate-500">Allocate from available balance</span>
          </div>
        </div>
        <ChevronRight className="text-cyan-300 group-hover:text-cyan-500 transition-colors" />
      </button>

      {/* Withdraw for Spending (Moved to bottom as less frequent) */}
      <button
        onClick={() => handleViewChange('withdraw_for_spending')}
        className="w-full bg-red-50 border-2 border-red-100 p-4 rounded-2xl flex items-center justify-between group active:scale-95 transition-transform"
        aria-label="Withdraw money for spending from a specific fund"
      >
        <div className="flex items-center gap-4">
          <div className="bg-red-100 p-3 rounded-xl text-red-600">
            <DollarSign size={24} />
          </div>
          <div className="text-left">
            <span className="block text-lg font-bold text-slate-800">Withdraw for Spending</span>
            <span className="text-xs font-medium text-slate-500">From Emergency or a Goal</span>
          </div>
        </div>
        <ChevronRight className="text-red-300 group-hover:text-red-500 transition-colors" />
      </button>

      {/* Review drafts */}
      <button
        onClick={() => handleViewChange('drafts')}
        className="w-full bg-amber-50 border-2 border-amber-100 p-4 rounded-2xl flex items-center justify-between group active:scale-95 transition-transform"
        aria-label="Review imported drafts"
      >
        <div className="flex items-center gap-4">
          <div className="bg-amber-100 p-3 rounded-xl text-amber-600">
            <ListChecks size={24} />
          </div>
          <div className="text-left">
            <span className="block text-lg font-bold text-slate-800">Review Drafts</span>
            <span className="text-xs font-medium text-slate-500">Confirm AI imports</span>
          </div>
        </div>
        <ChevronRight className="text-amber-300 group-hover:text-amber-500 transition-colors" />
      </button>
    </div>
  );

  const renderDraftsView = () => (
    <div className="flex flex-col h-full space-y-4 animate-in slide-in-from-right-8 duration-300">
      <div className="flex items-center gap-4 mb-2">
        <button
          type="button"
          onClick={() => setView('menu')}
          className="p-2 -ml-2 text-slate-400 hover:text-slate-600 active:scale-90 transition-transform"
          aria-label="Go back to menu"
        >
          <ArrowLeft size={24} />
        </button>
        <h2 className="text-xl font-black text-amber-700">Imported Drafts</h2>
      </div>

      <p className="text-sm font-medium text-slate-500">
        AI batches stay in draft mode until you confirm them. Pending drafts do not impact your Safe to Spend.
      </p>

      <DraftList
        drafts={drafts}
        title="Drafts inside MoneySheet"
        onConfirm={(id) => confirmDraft(id)}
        onEdit={(draft) => handleDraftEdit(draft)}
        onPending={(id) => markDraftStatus(id, 'pending')}
        onDiscard={(id) => markDraftStatus(id, 'discarded')}
        onConfirmAll={drafts.some((d) => d.status === 'pending') ? confirmAllDrafts : undefined}
        compact
      />
    </div>
  );

  const renderTransferForm = () => {
    // Determine max amount based on direction and target
    let maxAmount = 0;
    if (transferDirection === 'deposit') {
        maxAmount = snapshot.availableBalance;
    } else { // withdraw
        maxAmount = transferTarget === 'savings' ? snapshot.unallocatedSavings : snapshot.emergencyFund;
    }

    const currentAmount = parseFloat(amount || '0');
    const isError = currentAmount > maxAmount || currentAmount <= 0;

    const title = transferDirection === 'deposit' ? 'Deposit Funds' : 'Withdraw Funds';

    return (
        <form onSubmit={handleSubmit} className="flex flex-col h-full animate-in slide-in-from-right-8 duration-300">
            <div className="flex items-center gap-4 mb-6">
                <button 
                    type="button"
                    onClick={() => setView('menu')}
                    className="p-2 -ml-2 text-slate-400 hover:text-slate-600 active:scale-90 transition-transform"
                    aria-label="Go back to menu"
                >
                    <ArrowLeft size={24} />
                </button>
                <h2 className="text-xl font-black text-cyan-600">{title}</h2>
            </div>

            <div className="space-y-6 flex-1">
                {/* Transfer Direction Selector */}
                <div className="flex p-1 bg-slate-100 rounded-xl mb-4">
                  <button
                    type="button"
                    onClick={() => setTransferDirection('deposit')}
                    className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${
                      transferDirection === 'deposit' ? 'bg-white text-cyan-600 shadow-sm' : 'text-slate-400'
                    }`}
                    aria-label="Select deposit direction"
                  >
                    Deposit
                  </button>
                  <button
                    type="button"
                    onClick={() => setTransferDirection('withdraw')}
                    className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${
                      transferDirection === 'withdraw' ? 'bg-white text-rose-500 shadow-sm' : 'text-slate-400'
                    }`}
                    aria-label="Select withdraw direction"
                  >
                    Withdraw
                  </button>
                </div>

                {/* 1. Destination/Source Selector */}
                <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                        {transferDirection === 'deposit' ? 'Where is it going?' : 'Where is it coming from?'}
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                        <button
                            type="button"
                            onClick={() => setTransferTarget('savings')}
                            className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all ${
                                transferTarget === 'savings' 
                                ? 'bg-indigo-50 border-indigo-500 text-indigo-700' 
                                : 'bg-white border-slate-100 text-slate-400 hover:border-indigo-100'
                            }`}
                            aria-label={`${transferDirection} to/from savings`}
                        >
                            <Lock size={28} strokeWidth={2.5} />
                            <span className="font-bold text-sm">Savings</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setTransferTarget('emergency')}
                            className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all ${
                                transferTarget === 'emergency' 
                                ? 'bg-amber-50 border-amber-500 text-amber-700' 
                                : 'bg-white border-slate-100 text-slate-400 hover:border-amber-100'
                            }`}
                            aria-label={`${transferDirection} to/from emergency fund`}
                        >
                            <ShieldCheck size={28} strokeWidth={2.5} />
                            <span className="font-bold text-sm">Emergency</span>
                        </button>
                    </div>
                </div>

                {/* 2. Amount */}
                <div>
                    <div className="flex justify-between items-center mb-2">
                        <label htmlFor="transfer-amount" className="text-xs font-bold text-slate-400 uppercase tracking-wider">Amount</label>
                        <span className="text-xs font-bold text-slate-400">
                            {transferDirection === 'deposit' ? 'Available to move' : 'Available in fund'}: ${maxAmount.toLocaleString()}
                        </span>
                    </div>
                    <div className="relative">
                        <DollarSign className="absolute left-0 top-1/2 -translate-y-1/2 text-slate-300" size={24} />
                        <input
                            id="transfer-amount"
                            type="number"
                            step="0.01"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder="0.00"
                            className={`w-full pl-8 text-4xl font-black placeholder:text-slate-200 focus:outline-none bg-transparent ${isError ? 'text-rose-500' : 'text-slate-800'}`}
                            autoFocus
                            required
                        />
                    </div>
                    {isError && currentAmount > 0 && (
                        <p className="text-xs font-bold text-rose-500 mt-2">
                            {transferDirection === 'deposit' ? "You can't deposit more than you have available." : "You can't withdraw more than is in the fund."}
                        </p>
                    )}
                     {isError && currentAmount <= 0 && amount !== '' && (
                        <p className="text-xs font-bold text-rose-500 mt-2">
                            Amount must be greater than zero.
                        </p>
                    )}
                </div>
            </div>

             <button
                type="submit"
                disabled={isError || !amount}
                className="w-full bg-cyan-600 disabled:bg-slate-300 text-white font-bold text-lg py-4 rounded-2xl shadow-lg shadow-cyan-100 active:scale-95 transition-all flex items-center justify-center gap-2 mt-4"
                aria-label={transferDirection === 'deposit' ? 'Confirm money deposit' : 'Confirm money withdrawal'}
            >
                <span>{transferDirection === 'deposit' ? 'Confirm Deposit' : 'Confirm Withdrawal'}</span>
                <Check size={20} />
            </button>
        </form>
    );
  };

  const renderWithdrawForSpendingForm = () => {
    const activeGoals = snapshot.goals.filter(g => g.status === 'active');
    
    let maxAmount = 0;
    if (spendingSourceFundId === 'emergency') {
        maxAmount = snapshot.emergencyFund;
    } else if (spendingSourceFundId) {
        const goal = snapshot.goals.find(g => g.id === spendingSourceFundId);
        maxAmount = goal ? goal.allocatedAmount : 0;
    }

    const currentAmount = parseFloat(amount || '0');
    const isError = currentAmount > maxAmount || currentAmount <= 0;

    return (
      <form onSubmit={handleSubmit} className="flex flex-col h-full animate-in slide-in-from-right-8 duration-300">
        <div className="flex items-center gap-4 mb-6">
          <button 
            type="button"
            onClick={() => setView('menu')}
            className="p-2 -ml-2 text-slate-400 hover:text-slate-600 active:scale-90 transition-transform"
            aria-label="Go back to menu"
          >
            <ArrowLeft size={24} />
          </button>
          <h2 className="text-xl font-black text-red-600">Withdraw for Spending</h2>
        </div>

        <div className="space-y-6 flex-1">
            {/* 1. Source Fund Selector */}
            <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                    Which fund is this coming from?
                </label>
                <div className="grid grid-cols-2 gap-3">
                    <button
                        type="button"
                        onClick={() => setSpendingSourceFundId('emergency')}
                        className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all ${
                            spendingSourceFundId === 'emergency' 
                            ? 'bg-amber-50 border-amber-500 text-amber-700' 
                            : 'bg-white border-slate-100 text-slate-400 hover:border-amber-100'
                        }`}
                        aria-label="Select emergency fund as source"
                    >
                        <ShieldCheck size={28} strokeWidth={2.5} />
                        <span className="font-bold text-sm">Emergency</span>
                    </button>

                    {/* Goals as Source */}
                    {activeGoals.length > 0 && activeGoals.map(g => (
                        <button
                            key={g.id}
                            type="button"
                            onClick={() => setSpendingSourceFundId(g.id)}
                            className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all ${
                                spendingSourceFundId === g.id
                                ? 'bg-indigo-50 border-indigo-500 text-indigo-700' 
                                : 'bg-white border-slate-100 text-slate-400 hover:border-indigo-100'
                            }`}
                            aria-label={`Select goal ${g.name} as source`}
                        >
                            <Target size={28} strokeWidth={2.5} />
                            <span className="font-bold text-sm">{g.name}</span>
                        </button>
                    ))}
                    {activeGoals.length === 0 && spendingSourceFundId !== 'emergency' && (
                        <div className="p-4 rounded-2xl border-2 border-slate-100 text-slate-300 flex flex-col items-center gap-2">
                             <Lock size={28} strokeWidth={2.5} />
                             <span className="font-bold text-sm">No Goals</span>
                        </div>
                    )}
                </div>
            </div>

            {/* 2. Amount */}
            <div>
                <div className="flex justify-between items-center mb-2">
                    <label htmlFor="spending-amount" className="text-xs font-bold text-slate-400 uppercase tracking-wider">Amount to Withdraw</label>
                    <span className="text-xs font-bold text-slate-400">
                        Available in fund: ${maxAmount.toLocaleString()}
                    </span>
                </div>
                <div className="relative">
                    <DollarSign className="absolute left-0 top-1/2 -translate-y-1/2 text-slate-300" size={24} />
                    <input
                        id="spending-amount"
                        type="number"
                        step="0.01"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="0.00"
                        className={`w-full pl-8 text-4xl font-black placeholder:text-slate-200 focus:outline-none bg-transparent ${isError ? 'text-rose-500' : 'text-slate-800'}`}
                        autoFocus
                        required
                    />
                </div>
                {isError && currentAmount > 0 && (
                    <p className="text-xs font-bold text-rose-500 mt-2">
                        You can't withdraw more than is in the selected fund.
                    </p>
                )}
                {isError && currentAmount <= 0 && amount !== '' && (
                    <p className="text-xs font-bold text-rose-500 mt-2">
                        Amount must be greater than zero.
                    </p>
                )}
            </div>
        </div>

        <button
            type="submit"
            disabled={isError || !amount || !spendingSourceFundId}
            className="w-full bg-red-600 disabled:bg-slate-300 text-white font-bold text-lg py-4 rounded-2xl shadow-lg shadow-red-100 active:scale-95 transition-all flex items-center justify-center gap-2 mt-4"
            aria-label="Confirm withdrawal for spending"
        >
            <span>Confirm Withdrawal</span>
            <Check size={20} />
        </button>
      </form>
    );
  };

  const renderReturnUnusedCashForm = () => {
    const targetSourceFundId = lastWithdrawalForSpending?.sourceFundId;
    let targetFundName = "Original Fund";
    let targetIcon = <Wallet size={28} strokeWidth={2.5} />;
    let targetColorClass = 'bg-[#492582] border-[#492582] text-white';

    if (targetSourceFundId === 'emergency') {
      targetFundName = "Emergency Fund";
      targetIcon = <ShieldCheck size={28} strokeWidth={2.5} />;
      targetColorClass = 'bg-amber-500 border-amber-500 text-white';
    } else if (targetSourceFundId) {
      const goal = snapshot.goals.find(g => g.id === targetSourceFundId);
      if (goal) {
        targetFundName = goal.name;
        targetIcon = <Target size={28} strokeWidth={2.5} />;
        targetColorClass = 'bg-indigo-500 border-indigo-500 text-white';
      }
    }

    const maxAmount = snapshot.availableBalance;
    const currentAmount = parseFloat(amount || '0');
    const isError = currentAmount > maxAmount || currentAmount <= 0;

    return (
      <form onSubmit={handleSubmit} className="flex flex-col h-full animate-in slide-in-from-right-8 duration-300">
        <div className="flex items-center gap-4 mb-6">
          <button 
            type="button"
            onClick={() => onClose()} // Simply close if cancelling this return
            className="p-2 -ml-2 text-slate-400 hover:text-slate-600 active:scale-90 transition-transform"
            aria-label="Cancel return unused cash"
          >
            <ArrowLeft size={24} />
          </button>
          <h2 className="text-xl font-black text-indigo-600">Return Unused Cash</h2>
        </div>

        <div className="space-y-6 flex-1">
            {/* 1. Target Fund Display */}
            <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                    Returning to
                </label>
                <div className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 ${targetColorClass}`}>
                    {targetIcon}
                    <span className="font-bold text-sm">{targetFundName}</span>
                </div>
            </div>

            {/* 2. Amount to Return */}
            <div>
                <div className="flex justify-between items-center mb-2">
                    <label htmlFor="return-amount" className="text-xs font-bold text-slate-400 uppercase tracking-wider">Amount to Return</label>
                    <span className="text-xs font-bold text-slate-400">
                        Available in wallet: ${maxAmount.toLocaleString()}
                    </span>
                </div>
                <div className="relative">
                    <DollarSign className="absolute left-0 top-1/2 -translate-y-1/2 text-slate-300" size={24} />
                    <input
                        id="return-amount"
                        type="number"
                        step="0.01"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="0.00"
                        className={`w-full pl-8 text-4xl font-black placeholder:text-slate-200 focus:outline-none bg-transparent ${isError ? 'text-rose-500' : 'text-slate-800'}`}
                        autoFocus
                        required
                    />
                </div>
                {isError && currentAmount > 0 && (
                    <p className="text-xs font-bold text-rose-500 mt-2">
                        You can't return more than you have available.
                    </p>
                )}
                {isError && currentAmount <= 0 && amount !== '' && (
                    <p className="text-xs font-bold text-rose-500 mt-2">
                        Amount must be greater than zero.
                    </p>
                )}
            </div>
        </div>

        <button
            type="submit"
            disabled={isError || !amount}
            className="w-full bg-indigo-600 disabled:bg-slate-300 text-white font-bold text-lg py-4 rounded-2xl shadow-lg shadow-indigo-100 active:scale-95 transition-all flex items-center justify-center gap-2 mt-4"
            aria-label="Confirm return of unused cash"
        >
            <span>Confirm Return</span>
            <Check size={20} />
        </button>
      </form>
    );
  };


  const renderRegularPaymentForm = () => {
    return (
      <form onSubmit={handleSubmit} className="flex flex-col h-full animate-in slide-in-from-right-8 duration-300">
         <div className="flex items-center gap-4 mb-6">
          <button 
            type="button"
            onClick={() => setView('menu')}
            className="p-2 -ml-2 text-slate-400 hover:text-slate-600 active:scale-90 transition-transform"
            aria-label="Go back to menu"
          >
            <ArrowLeft size={24} />
          </button>
          <h2 className="text-xl font-black text-indigo-600">Add a Regular Payment</h2>
        </div>

        <div className="space-y-6 flex-1 overflow-y-auto no-scrollbar pb-4">
           {/* 1. What is this payment? */}
           <div>
            <label htmlFor="payment-note" className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                What is this payment?
            </label>
            <input
                id="payment-note"
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Rent, Phone bill, Loan, Netflix..."
                className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-200"
                required
                autoFocus
            />
          </div>

          {/* 2. How much do you pay? */}
           <div>
            <label htmlFor="payment-amount" className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">How much do you pay?</label>
            <div className="relative">
                <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
                <input
                    id="payment-amount"
                    type="number"
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0"
                    className="w-full p-4 pl-12 bg-slate-50 rounded-2xl font-black text-xl text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-200"
                    required
                />
            </div>
          </div>

          {/* 3. How often do you pay it? */}
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">How often do you pay it?</label>
            <div className="grid grid-cols-2 gap-2 mb-2">
                {(['weekly', 'biweekly', 'monthly', 'irregular'] as PaymentFrequency[]).map(freq => (
                    <button
                        key={freq}
                        type="button"
                        onClick={() => {
                          setFrequency(freq);
                          if (freq !== 'irregular') setIrregularity(undefined);
                        }}
                        className={`py-3 px-2 rounded-xl text-sm font-bold border-2 transition-all capitalize ${
                            frequency === freq
                            ? 'bg-indigo-600 text-white border-transparent'
                            : 'bg-white text-slate-500 border-slate-100 hover:border-indigo-100'
                        }`}
                        aria-label={`Select frequency ${freq}`}
                    >
                        {freq === 'biweekly' ? 'Every two weeks' : freq === 'irregular' ? 'Irregular (not on a fixed schedule)' : freq}
                    </button>
                ))}
            </div>

            {/* Irregular Logic */}
            {frequency === 'irregular' && (
              <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex gap-3">
                  <Info className="text-slate-400 shrink-0 mt-0.5" size={18} />
                  <p className="text-xs text-slate-500 leading-relaxed font-medium">
                    This payment doesn’t follow a fixed schedule.<br/>
                    We won’t predict it automatically.<br/>
                    We’ll help you keep it in mind.<br/>
                  </p>
                </div>

                <div>
                   <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                      Approximate frequency (optional)
                   </label>
                   <div className="flex flex-wrap gap-2">
                      {[
                        { id: 'about_weekly', label: 'About weekly' },
                        { id: 'about_monthly', label: 'About monthly' },
                        { id: 'few_times_year', label: 'A few times a year' }
                      ].map((opt) => (
                         <button
                            key={opt.id}
                            type="button"
                            onClick={() => setIrregularity(opt.id as Irregularity)}
                            className={`px-3 py-2 rounded-lg text-xs font-bold border transition-all ${
                               irregularity === opt.id
                               ? 'bg-slate-800 text-white border-slate-800'
                               : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                            }`}
                            aria-label={`Select irregularity ${opt.label}`}
                         >
                            {opt.label}
                         </button>
                      ))}
                   </div>
                   <p className="text-[10px] text-slate-400 mt-2">
                      This helps us decide how often to remind you. It won’t affect calculations.
                   </p>
                </div>
              </div>
            )}
          </div>

          {/* 4. When is the next payment due? */}
          <div>
            <label htmlFor="payment-date" className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                When is the next payment due?
            </label>
            <span className="block text-[10px] text-slate-400 font-medium mb-2">So we know what’s coming next</span>
            <div className="relative">
                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input
                    id="payment-date"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full p-4 pl-12 bg-slate-50 rounded-2xl font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-200"
                    required
                />
            </div>
          </div>
        </div>

        <button
            type="submit"
            className="w-full bg-indigo-600 text-white font-bold text-lg py-4 rounded-2xl shadow-lg shadow-indigo-100 active:scale-95 transition-all flex items-center justify-center gap-2 mt-4"
            aria-label="Confirm regular payment"
        >
            <span>Confirm Payment</span>
            <Check size={20} />
        </button>
      </form>
    );
  };

  const renderStandardForm = () => {
    const isIncome = view === 'income';
    const colorClass = isIncome ? 'text-green-600' : 'text-rose-600';
    const bgClass = isIncome ? 'bg-green-600' : 'bg-rose-600';
    const title = isIncome ? 'Add Income' : 'Add Expense';
    const activeCategories = isIncome ? incomeCategories : expenseCategories;

    return (
      <form onSubmit={handleSubmit} className="flex flex-col h-full animate-in slide-in-from-right-8 duration-300">
        <div className="flex items-center gap-4 mb-6">
          <button 
            type="button"
            onClick={() => setView('menu')}
            className="p-2 -ml-2 text-slate-400 hover:text-slate-600 active:scale-90 transition-transform"
            aria-label="Go back to menu"
          >
            <ArrowLeft size={24} />
          </button>
          <h2 className={`text-xl font-black ${colorClass}`}>{title}</h2>
        </div>

        <div className="space-y-5 flex-1 overflow-y-auto no-scrollbar pb-4">
          {/* Amount Input */}
          <div>
            <label htmlFor="std-amount" className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Amount</label>
            <div className="relative">
                <DollarSign className="absolute left-0 top-1/2 -translate-y-1/2 text-slate-300" size={24} />
                <input
                    id="std-amount"
                    type="number"
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full pl-8 text-4xl font-black text-slate-800 placeholder:text-slate-200 focus:outline-none"
                    autoFocus
                    required
                />
            </div>
          </div>

          {/* Name/Note Input */}
          <div>
            <label htmlFor="std-note" className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                Note
            </label>
            <input
                id="std-note"
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. Lunch, Groceries"
                className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-200"
            />
          </div>

          {/* Date Picker */}
          <div>
            <label htmlFor="std-date" className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                Date
            </label>
            <div className="relative">
                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input
                    id="std-date"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full p-4 pl-12 bg-slate-50 rounded-2xl font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-200"
                    required
                />
            </div>
          </div>

          {/* Categories */}
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Category</label>
            <div className="flex flex-wrap gap-2">
                {activeCategories.map(cat => (
                    <button
                        key={cat}
                        type="button"
                        onClick={() => setCategory(cat)}
                        className={`px-3 py-2 rounded-xl text-xs font-bold border-2 transition-all ${
                            category === cat 
                            ? `border-transparent ${bgClass} text-white shadow-md` 
                            : 'border-slate-100 bg-white text-slate-500 hover:border-slate-200'
                        }`}
                        aria-label={`Select category ${getCategoryLabel(cat)}`}
                    >
                        {getCategoryLabel(cat)}
                    </button>
                ))}
            </div>
          </div>

          {/* Recurring Toggle (Optional for standard expense) */}
          <label htmlFor="std-recurring" className="flex items-center gap-4 p-4 border-2 border-slate-100 rounded-2xl cursor-pointer hover:bg-slate-50 transition-colors">
            <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-colors ${recurring ? `${bgClass} border-transparent` : 'border-slate-300 bg-white'}`}>
                {recurring && <Check size={16} className="text-white" />}
            </div>
            <input 
                id="std-recurring"
                type="checkbox" 
                className="hidden" 
                checked={recurring} 
                onChange={(e) => setRecurring(e.target.checked)} 
            />
            <div className="flex-1">
                <span className="block text-sm font-bold text-slate-700">Repeat Monthly?</span>
                <span className="text-xs font-medium text-slate-400">For recurring bills/income</span>
            </div>
          </label>
        </div>

        {/* Submit Button */}
        <button
            type="submit"
            className={`w-full ${bgClass} text-white font-bold text-lg py-4 rounded-2xl shadow-lg shadow-slate-200 active:scale-95 transition-all flex items-center justify-center gap-2 mt-2`}
            aria-label="Save transaction"
        >
            <span>Save Transaction</span>
            <Check size={20} />
        </button>
      </form>
    );
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center pointer-events-none">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm pointer-events-auto transition-opacity"
        onClick={onClose}
        aria-label="Close money sheet"
      />

      {/* Sheet */}
      <div className="bg-white w-full max-w-md rounded-t-3xl p-6 shadow-2xl relative pointer-events-auto animate-in slide-in-from-bottom-full duration-300 max-h-[90vh] flex flex-col">
        {/* Close Handle/Button */}
        <div className="absolute top-4 right-4 z-10">
          <button 
            onClick={onClose}
            className="p-2 bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors"
            aria-label="Close money sheet"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="mt-2 flex-1 overflow-hidden">
          {view === 'menu' ? renderMenu() :
           view === 'transfer' ? renderTransferForm() :
           view === 'regular' ? renderRegularPaymentForm() :
           view === 'withdraw_for_spending' ? renderWithdrawForSpendingForm() :
           view === 'return_unused_cash' ? renderReturnUnusedCashForm() :
           view === 'drafts' ? renderDraftsView() :
           renderStandardForm()}
        </div>
      </div>

      <TransactionModal
        isOpen={draftModalOpen}
        onClose={() => {
          setDraftModalOpen(false);
          setEditingDraft(null);
        }}
        onSave={(data) => {
          handleDraftSave(data);
          setDraftModalOpen(false);
          setEditingDraft(null);
        }}
        initialType={editingDraft?.type || 'expense'}
        initialData={
          editingDraft
            ? {
                id: editingDraft.id,
                amount: editingDraft.amount,
                type: editingDraft.type,
                category: editingDraft.category,
                note: editingDraft.note,
                date: editingDraft.date,
                recurring: editingDraft.recurring,
                frequency: editingDraft.frequency,
                irregularity: editingDraft.irregularity,
                sourceFundId: editingDraft.sourceFundId,
              }
            : undefined
        }
      />
    </div>
  );
};

export default MoneySheet;