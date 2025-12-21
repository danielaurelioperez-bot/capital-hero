import type { TransactionType } from './storage';

export interface TransactionDraft {
  amount?: number;
  merchant?: string;
  date?: string;
  type?: TransactionType;
  category?: string;
  note?: string;
  ocrText?: string;
}

export interface ParseTransactionResponse {
  draft: TransactionDraft;
  confidence: number;
  missing: string[];
  error?: string;
}

export const requestTransactionDraft = async (file: File): Promise<ParseTransactionResponse> => {
  const formData = new FormData();
  formData.append('receipt', file);

  const response = await fetch('/api/ai/parse-transaction', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({ error: 'Unable to parse receipt' }));
    throw new Error(payload.error || 'Unable to parse receipt');
  }

  return response.json();
};
