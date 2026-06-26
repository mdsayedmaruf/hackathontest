// Base URL of the backend API.
// - In local dev, leave VITE_API_URL empty and Vite proxies /api to :8000.
// - On Vercel, set VITE_API_URL to your Render backend URL, e.g.
//   https://your-backend.onrender.com
const API_BASE = import.meta.env.VITE_API_URL || "";

/**
 * Stream a chat completion via SSE.
 * @param {Array<{role: string, content: string}>} messages
 * @param {(chunk: string) => void} onChunk - called with each text delta
 * @param {AbortSignal} signal
 * @returns {Promise<void>}
 */
export async function streamChat(messages, onChunk, signal) {
  const resp = await fetch(`${API_BASE}/api/chat/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages, stream: true }),
    signal,
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Request failed (${resp.status}): ${text}`);
  }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    // SSE events are separated by a blank line.
    const events = buffer.split("\n\n");
    buffer = events.pop() ?? "";

    for (const event of events) {
      const line = event.trim();
      if (!line.startsWith("data:")) continue;
      const data = line.slice("data:".length).trim();
      if (data === "[DONE]") return;

      try {
        const parsed = JSON.parse(data);
        if (parsed.error) throw new Error(parsed.error);
        if (parsed.content) onChunk(parsed.content);
      } catch (err) {
        if (err instanceof SyntaxError) continue; // partial JSON, skip
        throw err;
      }
    }
  }
}

export async function checkHealth() {
  const resp = await fetch(`${API_BASE}/api/health`);
  return resp.json();
}
