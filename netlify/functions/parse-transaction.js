export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ error: 'Method Not Allowed' }),
    };
  }

  const rawText = event.body || '';
  const normalizedText = rawText.trim();
  const today = new Date().toISOString().split('T')[0];

  const amountMatch = normalizedText.match(/([0-9]+(?:\.[0-9]{1,2})?)/);
  const merchantMatch = normalizedText.match(/at\s+([A-Za-z\s]+)/i);

  const amount = amountMatch ? parseFloat(amountMatch[1]) : 23.4;
  const merchant = merchantMatch ? merchantMatch[1].trim() : 'Starbucks';

  const responseBody = {
    draft: {
      type: 'expense',
      amount,
      merchant,
      date: today,
      category: 'Lifestyle',
      notes: normalizedText || 'Imported transaction',
    },
    confidence: 0.9,
    missing: normalizedText ? [] : ['description'],
  };

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
    body: JSON.stringify(responseBody),
  };
};
