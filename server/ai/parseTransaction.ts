import type { IncomingMessage, ServerResponse } from 'http';
import type { Plugin } from 'vite';

interface ParsedDraft {
  amount?: number;
  merchant?: string;
  date?: string;
  type?: 'income' | 'expense';
  category?: string;
  note?: string;
  confidence?: number;
  ocrText?: string;
  missing?: string[];
}

const CONFIDENCE_FALLBACK = 0.35;

const parseJsonSafely = (text: string): ParsedDraft => {
  try {
    const cleaned = text.replace(/```json/gi, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleaned);
    return parsed as ParsedDraft;
  } catch (error) {
    console.warn('Failed to parse AI response as JSON', error);
    return {};
  }
};

const normalizeDraft = (raw: ParsedDraft): { draft: ParsedDraft; missing: string[]; confidence: number } => {
  const missing: string[] = [];
  const draft: ParsedDraft = {
    amount: raw.amount,
    merchant: raw.merchant || raw.note,
    date: raw.date,
    type: raw.type === 'income' ? 'income' : 'expense',
    category: raw.category,
    note: raw.note,
    ocrText: raw.ocrText,
  };

  if (draft.amount === undefined || Number.isNaN(Number(draft.amount))) {
    draft.amount = undefined;
    missing.push('amount');
  }
  if (!draft.merchant) missing.push('merchant');
  if (!draft.date) missing.push('date');
  if (!draft.category) missing.push('category');

  const confidence = Math.max(0, Math.min(1, raw.confidence ?? CONFIDENCE_FALLBACK));

  return { draft, missing, confidence };
};

const extractReceiptDraft = async (fileBuffer: Buffer, mimeType: string) => {
  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured.');
  }

  const prompt = `You are parsing a receipt image to draft a financial transaction.\nReturn ONLY a JSON object with:\n{\n  "amount": number (decimal),\n  "merchant": string,\n  "date": ISO 8601 date string (yyyy-mm-dd preferred),\n  "type": "expense" or "income",\n  "category": short label like Essentials, Non-essentials, Savings, Debt, Salary, Bonus, Other,\n  "note": short free text,\n  "confidence": number 0-1,\n  "ocrText": full extracted text\n}\nIf something is unclear, leave it null or empty and keep confidence low. Use the provided image inline.`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt },
              {
                inlineData: {
                  data: fileBuffer.toString('base64'),
                  mimeType,
                },
              },
            ],
          },
        ],
        generationConfig: { temperature: 0.2 },
      }),
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`AI request failed: ${response.status} ${errorText}`);
  }

  const json = await response.json();
  const text =
    json?.candidates?.[0]?.content?.parts
      ?.map((part: { text?: string }) => part?.text)
      .filter(Boolean)
      .join(' ') || JSON.stringify(json);

  const parsed = parseJsonSafely(text);
  return normalizeDraft(parsed);
};

const parseFormData = async (req: IncomingMessage): Promise<{ buffer: Buffer; mimeType: string }> => {
  const contentType = req.headers['content-type'] || '';
  const boundaryMatch = contentType.match(/boundary=([^;]+)/);

  if (!boundaryMatch) {
    throw new Error('Multipart form boundary not found.');
  }

  const boundary = boundaryMatch[1];
  const chunks: Buffer[] = [];

  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  const body = Buffer.concat(chunks).toString('binary');
  const parts = body.split(`--${boundary}`).filter((part) => part.includes('filename='));

  if (parts.length === 0) {
    throw new Error('No image found in request.');
  }

  const fileSection = parts[0];
  const mimeMatch = fileSection.match(/Content-Type:([^\r\n]+)/i);
  const mimeType = mimeMatch?.[1]?.trim() || 'application/octet-stream';

  const headerEndIndex = fileSection.indexOf('\r\n\r\n');
  if (headerEndIndex === -1) {
    throw new Error('Malformed multipart data.');
  }

  const fileContent = fileSection.slice(headerEndIndex + 4).replace(/\r\n--$/, '').replace(/\r\n$/, '');
  const buffer = Buffer.from(fileContent, 'binary');

  return { buffer, mimeType };
};

export const aiParsePlugin = (): Plugin => ({
  name: 'ai-parse-transaction-middleware',
  configureServer(server) {
    server.middlewares.use('/api/ai/parse-transaction', async (req: IncomingMessage, res: ServerResponse, next) => {
      if (req.method && req.method !== 'POST' && req.method !== 'OPTIONS') {
        return next();
      }

      res.setHeader('Content-Type', 'application/json');

      if (req.method === 'OPTIONS') {
        res.statusCode = 200;
        res.end(JSON.stringify({ ok: true }));
        return;
      }

      try {
        const { buffer, mimeType } = await parseFormData(req);
        const { draft, missing, confidence } = await extractReceiptDraft(buffer, mimeType);

        res.statusCode = 200;
        res.end(
          JSON.stringify({
            draft: {
              amount: draft.amount,
              merchant: draft.merchant,
              date: draft.date,
              type: draft.type,
              category: draft.category,
              note: draft.note,
              ocrText: draft.ocrText,
            },
            confidence,
            missing,
          }),
        );
      } catch (error) {
        console.error('AI parse error', error);
        res.statusCode = 400;
        res.end(
          JSON.stringify({
            error: (error as Error).message || 'Unable to process the receipt',
          }),
        );
      }
    });
  },
});

export default aiParsePlugin;
