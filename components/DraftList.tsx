import React from 'react';
import { Check, Clock, FileText, Pencil, Trash2, UploadCloud } from 'lucide-react';
import { TransactionDraft } from '../hooks/useFinance';

interface DraftListProps {
  drafts: TransactionDraft[];
  title?: string;
  onConfirm: (id: string) => void;
  onEdit: (draft: TransactionDraft) => void;
  onPending: (id: string) => void;
  onDiscard: (id: string) => void;
  onConfirmAll?: () => void;
  compact?: boolean;
}

const DraftList: React.FC<DraftListProps> = ({
  drafts,
  title = 'Imported drafts',
  onConfirm,
  onEdit,
  onPending,
  onDiscard,
  onConfirmAll,
  compact = false,
}) => {
  const pendingDrafts = drafts.filter((d) => d.status === 'pending');

  if (drafts.length === 0) {
    return (
      <div className="w-full bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-4 text-center text-sm text-slate-500">
        No drafts to review yet.
      </div>
    );
  }

  return (
    <div className={`w-full ${compact ? 'space-y-3' : 'space-y-4'}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">{title}</p>
          <p className="text-sm font-bold text-slate-600">
            {pendingDrafts.length} pending · {drafts.length - pendingDrafts.length} processed
          </p>
        </div>
        {onConfirmAll && pendingDrafts.length > 0 && (
          <button
            onClick={onConfirmAll}
            className="px-3 py-2 bg-emerald-100 text-emerald-700 font-bold text-xs rounded-xl border-2 border-emerald-200 hover:border-emerald-300 active:scale-95 transition-transform"
          >
            Confirm all
          </button>
        )}
      </div>

      {drafts.map((draft) => {
        const amountColor = draft.type === 'income' ? 'text-emerald-600' : 'text-rose-600';
        return (
          <div
            key={draft.id}
            className="bg-white border-2 border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col gap-3"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className={`p-2 rounded-xl ${draft.type === 'income' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                  <UploadCloud size={18} />
                </div>
                <div className="min-w-0">
                  <p className={`text-lg font-black ${amountColor}`}>${draft.amount.toLocaleString()}</p>
                  <p className="text-xs font-bold text-slate-500 truncate">
                    {draft.note || 'Sin nota'}
                  </p>
                  <p className="text-[11px] font-bold text-slate-400 truncate">
                    {draft.category} · {new Date(draft.date).toLocaleDateString()} · {draft.sourceName || 'Upload'}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-black uppercase tracking-wide text-slate-400">Confidence</span>
                <div className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg inline-flex items-center gap-1">
                  <FileText size={12} />
                  {Math.round((draft.confidence ?? 0.5) * 100)}%
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <span
                className={`px-2 py-1 rounded-lg text-[11px] font-bold border ${
                  draft.status === 'pending'
                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                    : draft.status === 'confirmed'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-slate-50 text-slate-500 border-slate-200'
                }`}
              >
                {draft.status === 'pending' && 'Pending'}
                {draft.status === 'confirmed' && 'Confirmed'}
                {draft.status === 'discarded' && 'Discarded'}
              </span>
              {draft.recurring && (
                <span className="px-2 py-1 rounded-lg text-[11px] font-bold border bg-blue-50 text-blue-700 border-blue-200">
                  Recurring
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                onClick={() => onConfirm(draft.id)}
                className="flex items-center justify-center gap-1 text-xs font-bold bg-emerald-600 text-white rounded-xl py-2 shadow-sm active:scale-95 transition-transform"
              >
                <Check size={14} /> Confirm
              </button>
              <button
                onClick={() => onEdit(draft)}
                className="flex items-center justify-center gap-1 text-xs font-bold bg-white text-slate-600 border-2 border-slate-200 rounded-xl py-2 active:scale-95 transition-transform"
              >
                <Pencil size={14} /> Edit
              </button>
              <button
                onClick={() => onPending(draft.id)}
                className="flex items-center justify-center gap-1 text-xs font-bold bg-amber-50 text-amber-700 border-2 border-amber-200 rounded-xl py-2 active:scale-95 transition-transform"
              >
                <Clock size={14} /> Pending
              </button>
              <button
                onClick={() => onDiscard(draft.id)}
                className="flex items-center justify-center gap-1 text-xs font-bold bg-rose-50 text-rose-600 border-2 border-rose-200 rounded-xl py-2 active:scale-95 transition-transform"
              >
                <Trash2 size={14} /> Discard
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default DraftList;
