import { TransactionDraftSeed } from '../finance/storage';
import { PaymentFrequency } from '../hooks/useFinance';

export interface ParsedDraftResponse {
  drafts: TransactionDraftSeed[];
  confidence: number[];
}

export const parseTransactionsFromFile = async (file: File): Promise<ParsedDraftResponse> => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch('/api/ai/parse-transaction', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error('No se pudo analizar el archivo.');
  }

  const result = (await response.json()) as ParsedDraftResponse;
  return result;
};

export const normalizeDraftPayload = (
  drafts: ParsedDraftResponse['drafts'],
  confidence: ParsedDraftResponse['confidence']
): TransactionDraftSeed[] => {
  return drafts.map((draft, index) => ({
    ...draft,
    confidence: confidence[index] ?? undefined,
  }));
};

export const createMockDrafts = (fileName: string): ParsedDraftResponse => {
  const today = new Date().toISOString();
  const isPdf = fileName.toLowerCase().endsWith('.pdf');
  const sourceLabel = isPdf ? 'PDF import' : 'Image import';

  const drafts: TransactionDraftSeed[] = [
    {
      amount: 48.75,
      category: 'Essentials',
      note: `${sourceLabel}: Grocery run`,
      type: 'expense',
      recurring: false,
      date: today,
      sourceName: fileName,
    },
    {
      amount: 2150,
      category: 'Salary',
      note: `${sourceLabel}: Payroll`,
      type: 'income',
      recurring: true,
      frequency: 'monthly' as PaymentFrequency,
      date: today,
      sourceName: fileName,
    },
    {
      amount: 72.1,
      category: 'Non-essentials',
      note: `${sourceLabel}: Subscriptions bundle`,
      type: 'expense',
      recurring: true,
      frequency: 'monthly' as PaymentFrequency,
      date: today,
      sourceName: fileName,
    },
  ];

  const confidence = [0.84, 0.93, 0.74];
  return { drafts, confidence };
};
