import React, { useState, useEffect } from 'react';
import { X, Check, ShieldCheck, DollarSign } from 'lucide-react';
import { useFinance } from '../hooks/useFinance';

interface AllocateToEmergencyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AllocateToEmergencyModal: React.FC<AllocateToEmergencyModalProps> = ({ isOpen, onClose }) => {
  const { snapshot, allocateUnallocatedToEmergency } = useFinance();
  const [amount, setAmount] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setAmount('');
      setErrorMsg(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const maxAllocatable = snapshot.unallocatedSavings;
  const currentAmount = parseFloat(amount || '0');
  const isInvalidAmount = currentAmount <= 0 || currentAmount > maxAllocatable;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (isInvalidAmount) {
      if (currentAmount <= 0) {
        setErrorMsg("Amount must be greater than zero.");
      } else {
        setErrorMsg("Not enough unallocated cash available.");
      }
      return;
    }

    const success = allocateUnallocatedToEmergency(currentAmount);
    if (success) {
      onClose();
    } else {
      setErrorMsg("Failed to allocate. Please try again."); // Generic fallback
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2 text-amber-600">
            <ShieldCheck size={20} />
            <span className="font-black text-sm uppercase tracking-wider">
              Fund Emergency Fund
            </span>
          </div>
          <button onClick={onClose} className="p-2 bg-slate-100 rounded-full text-slate-400 hover:text-slate-600" aria-label="Close allocation modal">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="text-center mb-4">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Allocating from Unallocated Cash
            </span>
            <div className="text-sm font-bold text-slate-600">
              Available: ${maxAllocatable.toLocaleString()}
            </div>
          </div>

          <div className="relative">
            <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <label htmlFor="emergency-amount" className="sr-only">Amount to allocate</label>
            <input
              id="emergency-amount"
              type="number"
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value);
                setErrorMsg(null); // Clear error on change
              }}
              placeholder="0"
              max={maxAllocatable}
              className={`w-full p-4 pl-12 bg-slate-50 rounded-2xl font-black text-4xl focus:outline-none focus:ring-2 focus:ring-amber-100 text-slate-800 ${
                (currentAmount > maxAllocatable || (currentAmount <= 0 && amount !== '')) ? 'text-rose-500' : ''
              }`}
              autoFocus
            />
          </div>

          {errorMsg && (
            <p className="text-center text-xs font-bold text-rose-500 animate-in fade-in slide-in-from-top-1">
              {errorMsg}
            </p>
          )}

          <button
            type="submit"
            disabled={isInvalidAmount || !amount}
            className="w-full bg-amber-600 disabled:bg-slate-300 text-white py-4 rounded-2xl font-bold text-lg shadow-lg active:scale-95 transition-transform flex items-center justify-center gap-2"
            aria-label="Confirm allocation to emergency fund"
          >
            <Check size={20} />
            <span>Confirm Allocation</span>
          </button>

          <button type="button" onClick={onClose} className="w-full text-slate-400 font-bold py-2" aria-label="Cancel allocation">
            Cancel
          </button>
        </form>
      </div>
    </div>
  );
};

export default AllocateToEmergencyModal;