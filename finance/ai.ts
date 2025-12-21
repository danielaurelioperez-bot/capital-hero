export type ParsedTransactionDraft = {
  amount: number;
  type: 'income' | 'expense';
  category: string;
  note?: string;
  date?: string;
  recurring?: boolean;
};

const fallbackParse = (text: string): ParsedTransactionDraft => {
  const amountMatch = text.match(/([-+]?[0-9]+(?:\.[0-9]+)?)/);
  const amount = amountMatch ? parseFloat(amountMatch[1]) : 0;
  const isIncome = /ingreso|cobr[ée]|deposit|entr[oó]/i.test(text) || (amountMatch ? text.includes('+') : false);
  return {
    amount: Math.max(amount, 0),
    type: isIncome ? 'income' : 'expense',
    category: isIncome ? 'Salary' : 'Essentials',
    note: text.trim(),
    date: new Date().toISOString(),
    recurring: false,
  };
};

export const parseTransactionDraft = async (text: string): Promise<ParsedTransactionDraft> => {
  try {
    const response = await fetch('/api/ai/parse-transaction', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });

    if (response.ok) {
      const data = await response.json();
      const tx = data?.transaction || data;
      if (tx?.amount) {
        return {
          amount: Number(tx.amount),
          type: tx.type === 'income' ? 'income' : 'expense',
          category: tx.category || (tx.type === 'income' ? 'Salary' : 'Essentials'),
          note: tx.note || text.trim(),
          date: tx.date || new Date().toISOString(),
          recurring: Boolean(tx.recurring),
        };
      }
    }
  } catch (error) {
    console.warn('Falling back to local parsing', error);
  }

  return fallbackParse(text);
};
