import type { SimEstimateResult } from '@/types/schema';

interface SimResultPanelProps {
  result: SimEstimateResult;
}

export function SimResultPanel({ result }: SimResultPanelProps) {
  const formatted = result.estimated_uu.toLocaleString('ja-JP');

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
      <div className="text-center">
        <p className="text-sm text-gray-500 mb-1">推計UU数</p>
        <p className="text-4xl font-bold text-primary">{formatted}</p>
        <p className="text-xs text-gray-400 mt-1">
          実行日時: {new Date(result.executed_at).toLocaleString('ja-JP')}
          {result.query_duration_ms != null && (
            <span className="ml-2">({result.query_duration_ms.toLocaleString()}ms)</span>
          )}
        </p>
      </div>

      <div className="border-t border-gray-100 pt-4 space-y-1 text-sm text-gray-600">
        <p className="font-medium text-gray-700 mb-2">推計条件</p>
        <p>期間: {result.conditions.date_start} 〜 {result.conditions.date_end}</p>
        {result.conditions.uid_type && <p>UID種別: {result.conditions.uid_type}</p>}
        {result.conditions.prefectures?.length ? (
          <p>都道府県: {result.conditions.prefectures.join(', ')}</p>
        ) : null}
        {result.conditions.cities?.length ? (
          <p>市区町村: {result.conditions.cities.join(', ')}</p>
        ) : null}
        {result.conditions.poi_ids?.length ? (
          <p>POI ID: {result.conditions.poi_ids.join(', ')}</p>
        ) : null}
        {result.conditions.brand_ids?.length ? (
          <p>ブランド ID: {result.conditions.brand_ids.join(', ')}</p>
        ) : null}
        {result.conditions.radius_max != null && (
          <p>最大半径: {result.conditions.radius_max}m</p>
        )}
        {result.conditions.detection_count != null && (
          <p>検知回数（以上）: {result.conditions.detection_count}</p>
        )}
      </div>
    </div>
  );
}
