import { useState } from 'react';
import { SimConditionForm } from '@/components/SimConditionForm';
import { SimResultPanel } from '@/components/SimResultPanel';
import { postSimEstimate } from '@/utils/simApi';
import type { SimConditions, SimEstimateResult } from '@/types/schema';
import { toast } from 'sonner';

export function SimPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<SimEstimateResult | null>(null);

  async function handleEstimate(conditions: SimConditions) {
    setIsLoading(true);
    try {
      const res = await postSimEstimate(conditions);
      setResult(res);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'UU推計に失敗しました';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">SIM（シミュレーション）</h1>
        <p className="text-sm text-gray-500 mt-1">
          条件を指定して到達可能なUU数（ユニークユーザー数）を推計します。
        </p>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <SimConditionForm onSubmit={handleEstimate} isLoading={isLoading} />
      </div>

      {result && <SimResultPanel result={result} />}
    </div>
  );
}
