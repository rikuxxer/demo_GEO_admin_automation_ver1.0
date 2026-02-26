import type { SimConditions, SimEstimateResult } from '@/types/schema';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080';

export async function getSimStatus(): Promise<{ configured: boolean }> {
  const res = await fetch(`${API_BASE}/api/sim/status`);
  if (!res.ok) throw new Error('SIMステータスの取得に失敗しました');
  return res.json();
}

export async function postSimEstimate(conditions: SimConditions): Promise<SimEstimateResult> {
  const res = await fetch(`${API_BASE}/api/sim/estimate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(conditions),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'UU推計に失敗しました');
  }
  return res.json();
}
