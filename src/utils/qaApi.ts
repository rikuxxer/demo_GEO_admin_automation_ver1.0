const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

export interface QaMessage {
  role: 'user' | 'model';
  content: string;
}

export async function postQaChat(
  messages: QaMessage[],
  sessionId: string,
  userId: string
): Promise<{ reply: string; log_id: string }> {
  const res = await fetch(`${API_BASE}/api/qa/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, sessionId, userId }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'AI Q&A の呼び出しに失敗しました');
  }
  return res.json();
}

export async function postQaFeedback(
  log_id: string,
  feedback: 'good' | 'bad'
): Promise<void> {
  const res = await fetch(`${API_BASE}/api/qa/feedback`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ log_id, feedback }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'フィードバックの送信に失敗しました');
  }
}
