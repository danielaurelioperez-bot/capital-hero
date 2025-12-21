import { createMockDrafts } from './aiParser';

export const setupMockApi = () => {
  if (typeof window === 'undefined') return;
  const w = window as any;
  if (w.__mockApiReady) return;
  w.__mockApiReady = true;

  const originalFetch = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input.toString();
    const method = init?.method?.toUpperCase() || 'GET';

    if (url.endsWith('/api/ai/parse-transaction') && method === 'POST') {
      const body = init?.body;
      if (body instanceof FormData) {
        const file = body.get('file');
        if (file && file instanceof File) {
          const payload = createMockDrafts(file.name);
          return new Response(JSON.stringify(payload), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        }
      }

      return new Response(
        JSON.stringify({ error: 'Missing file attachment' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    return originalFetch(input as any, init);
  };
};
