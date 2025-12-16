import React, { useState, useEffect } from 'react';
import { X, Check, Target, ArrowDown, ArrowUp } from 'lucide-react';
import { Goal } from '../finance/storage';
import { useFinance } from '../hooks/useFinance';

interface GoalsModalProps {
  isOpen: boolean;
  onClose: () => void;
  goal?: Goal | null; // If null, creating new
}

const GoalsModal: React.FC<GoalsModalProps> = ({ isOpen, onClose, goal }) => {
  const { createGoal, updateGoal, allocateToGoal, withdrawFromGoal, snapshot, archiveGoal } = useFinance();
  
  // Modes: 'details' | 'edit' | 'transfer_in' | 'transfer_out'
  const [mode, setMode] = useState<'details' | 'edit' | 'transfer_in' | 'transfer_out'>('details');
  
  // Form State
  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [amount, setAmount] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
        if (goal) {
            setMode('details');
            setName(goal.name);
            setTargetAmount(goal.targetAmount.toString());
        } else {
            setMode('edit'); // Creating new
            setName('');
            setTargetAmount('');
        }
        setAmount('');
        setErrorMsg(null);
    }
  }, [isOpen, goal]);

  if (!isOpen) return null;

  const handleSaveGoal = (e: React.FormEvent) => {
      e.preventDefault();
      if (!name || !targetAmount) return;
      const target = parseFloat(targetAmount);

      if (goal) {
          updateGoal(goal.id, name, target);
          setMode('details');
      } else {
          createGoal(name, target);
          onClose();
      }
  };

  const handleTransfer = (e: React.FormEvent) => {
      e.preventDefault();
      if (!goal || !amount) return;
      const numAmount = parseFloat(amount);
      
      setErrorMsg(null);
      let success = false;

      if (mode === 'transfer_in') {
          success = allocateToGoal(goal.id, numAmount);
          if (!success) setErrorMsg("Not enough unallocated savings available.");
      } else {
          success = withdrawFromGoal(goal.id, numAmount);
           if (!success) setErrorMsg("Not enough funds in this goal.");
      }
      
      if (success) {
          onClose();
      }
  };

  const handleDelete = () => {
      if (goal && confirm("Archive this goal? Money will stay in it until moved.")) {
          archiveGoal(goal.id);
          onClose();
      }
  };

  // --- RENDER HELPERS ---

  const renderEditForm = () => (
      <form onSubmit={handleSaveGoal} className="space-y-4">
          <div>
              <label htmlFor="goal-name" className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Goal Name</label>
              <input 
                 id="goal-name"
                 value={name} 
                 onChange={e => setName(e.target.value)} 
                 placeholder="New Car, Vacation..."
                 className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                 autoFocus
              />
          </div>
          <div>
              <label htmlFor="goal-target-amount" className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Target Amount</label>
              <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                  <input 
                     id="goal-target-amount"
                     type="number"
                     value={targetAmount} 
                     onChange={e => setTargetAmount(e.target.value)} 
                     placeholder="0"
                     className="w-full p-4 pl-8 bg-slate-50 rounded-2xl font-black text-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                  />
              </div>
          </div>
          <button type="submit" className="w-full bg-[#492582] text-white py-4 rounded-2xl font-bold text-lg shadow-lg active:scale-95 transition-transform flex items-center justify-center gap-2"
            aria-label={goal ? 'Save changes to goal' : 'Create new goal'}
          >
              <Check size={20} />
              <span>{goal ? 'Save Changes' : 'Create Goal'}</span>
          </button>
      </form>
  );

  const renderTransferForm = () => {
      const isDeposit = mode === 'transfer_in';
      const max = isDeposit ? snapshot.unallocatedSavings : (goal?.allocatedAmount || 0);
      const isOverLimit = parseFloat(amount || '0') > max;
      
      return (
        <form onSubmit={handleTransfer} className="space-y-4">
            <div className="text-center mb-4">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    {isDeposit ? 'Allocating from Savings' : 'Returning to Savings'}
                </span>
                <div className="text-sm font-bold text-slate-600">
                    Available: ${max.toLocaleString()}
                </div>
            </div>

            <div className="relative">
                 <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                 <input 
                     id="transfer-amount"
                     type="number"
                     value={amount} 
                     onChange={e => {
                         setAmount(e.target.value);
                         setErrorMsg(null);
                     }} 
                     placeholder="0"
                     max={max}
                     className={`w-full p-4 pl-8 bg-slate-50 rounded-2xl font-black text-4xl focus:outline-none focus:ring-2 focus:ring-indigo-100 text-center ${isOverLimit ? 'text-rose-500' : 'text-slate-800'}`}
                     autoFocus
                  />
            </div>
            
            {errorMsg && (
                <p className="text-center text-xs font-bold text-rose-500 animate-in fade-in slide-in-from-top-1">
                    {errorMsg}
                </p>
            )}

            <button type="submit" disabled={!amount || isOverLimit} className="w-full bg-indigo-600 disabled:bg-slate-300 text-white py-4 rounded-2xl font-bold text-lg shadow-lg active:scale-95 transition-transform flex items-center justify-center gap-2"
              aria-label={isDeposit ? 'Deposit funds into goal' : 'Withdraw funds from goal'}
            >
                {isDeposit ? <ArrowDown size={20} /> : <ArrowUp size={20} />}
                <span>{isDeposit ? 'Deposit' : 'Withdraw'}</span>
            </button>

            <button type="button" onClick={() => setMode('details')} className="w-full text-slate-400 font-bold py-2"
              aria-label="Cancel transfer"
            >
                Cancel
            </button>
        </form>
      );
  };

  const renderDetails = () => {
      if (!goal) return null;
      const progress = Math.min(100, (goal.allocatedAmount / goal.targetAmount) * 100);

      return (
          <div className="space-y-6">
              {/* Header Info */}
              <div className="text-center space-y-2">
                  <h2 className="text-2xl font-black text-slate-800">{goal.name}</h2>
                  <div className="flex items-baseline justify-center gap-1">
                      <span className="text-4xl font-black text-indigo-600">${goal.allocatedAmount.toLocaleString()}</span>
                      <span className="text-slate-400 font-bold">/ ${goal.targetAmount.toLocaleString()}</span>
                  </div>
              </div>

              {/* Progress Bar */}
              <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-500 transition-all duration-500" style={{ width: `${progress}%` }}></div>
              </div>

              {/* Actions Grid */}
              <div className="grid grid-cols-2 gap-3">
                  <button 
                    onClick={() => setMode('transfer_in')}
                    className="p-4 bg-indigo-50 rounded-2xl border-2 border-indigo-100 flex flex-col items-center gap-2 hover:bg-indigo-100 transition-colors"
                    aria-label="Deposit funds"
                  >
                      <ArrowDown className="text-indigo-600" />
                      <span className="text-xs font-black text-indigo-800 uppercase">Deposit</span>
                  </button>

                  <button 
                    onClick={() => setMode('transfer_out')}
                    className="p-4 bg-slate-50 rounded-2xl border-2 border-slate-100 flex flex-col items-center gap-2 hover:bg-slate-100 transition-colors"
                    aria-label="Withdraw funds"
                  >
                      <ArrowUp className="text-slate-500" />
                      <span className="text-xs font-black text-slate-600 uppercase">Withdraw</span>
                  </button>
              </div>

              {/* Edit/Archive Links */}
              <div className="flex justify-between pt-4 border-t border-slate-100">
                  <button onClick={() => setMode('edit')} className="text-xs font-bold text-slate-400 hover:text-indigo-600"
                    aria-label="Edit goal details"
                  >
                      Edit Details
                  </button>
                  <button onClick={handleDelete} className="text-xs font-bold text-slate-400 hover:text-rose-500"
                    aria-label="Archive this goal"
                  >
                      Archive
                  </button>
              </div>
          </div>
      );
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
        <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-2 text-indigo-600">
                    <Target size={20} />
                    <span className="font-black text-sm uppercase tracking-wider">
                        {mode === 'edit' && !goal ? 'New Goal' : mode === 'transfer_in' ? 'Fund Goal' : mode === 'transfer_out' ? 'Withdraw' : 'Goal Details'}
                    </span>
                </div>
                <button onClick={onClose} className="p-2 bg-slate-100 rounded-full text-slate-400 hover:text-slate-600" aria-label="Close goal modal">
                    <X size={20} />
                </button>
            </div>

            {/* Content Swticher */}
            {mode === 'edit' ? renderEditForm() : (mode === 'transfer_in' || mode === 'transfer_out') ? renderTransferForm() : renderDetails()}
        </div>
    </div>
  );
};

export default GoalsModal;