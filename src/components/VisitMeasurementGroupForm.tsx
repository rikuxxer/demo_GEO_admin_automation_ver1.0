import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { X, AlertCircle, Settings } from 'lucide-react';
import { VisitMeasurementGroup } from '../types/schema';
import { SegmentFormCommonConditions } from './SegmentFormCommonConditions';
import { toast } from 'sonner';

interface VisitMeasurementGroupFormProps {
  projectId: string;
  group?: VisitMeasurementGroup | null;
  existingGroups?: VisitMeasurementGroup[];
  pois?: Array<{ visit_measurement_group_id?: string }>;
  onSubmit: (group: Partial<VisitMeasurementGroup>) => void;
  onCancel: () => void;
}

export function VisitMeasurementGroupForm({ 
  projectId, 
  group, 
  existingGroups = [], 
  pois = [],
  onSubmit, 
  onCancel 
}: VisitMeasurementGroupFormProps) {
  // このグループの地点数を取得
  const poiCount = group ? pois.filter(poi => poi.visit_measurement_group_id === group.group_id).length : 0;

  const [formData, setFormData] = useState<Partial<VisitMeasurementGroup>>({
    project_id: projectId,
    group_name: group?.group_name || '',
    designated_radius: group?.designated_radius || '',
    use_polygon: group?.use_polygon || false,
    polygon: group?.polygon || undefined,
    extraction_period: group?.extraction_period || '1month',
    extraction_period_type: (() => {
      const periodType = group?.extraction_period_type || 'custom';
      // 既存データに'preset'が含まれている場合は'custom'に変換
      return periodType === 'preset' ? 'custom' : periodType;
    })(),
    extraction_start_date: group?.extraction_start_date || '',
    extraction_end_date: group?.extraction_end_date || '',
    extraction_dates: group?.extraction_dates || [],
    // 来店計測地点の場合は指定属性と検知回数は使用しない（UIから非表示）
    // 既存データがある場合は読み込むが、保存時にはundefinedにする
    attribute: group?.attribute,
    detection_count: group?.detection_count,
    detection_time_start: group?.detection_time_start || '',
    detection_time_end: group?.detection_time_end || '',
    stay_time: group?.stay_time || '',
  });

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // バリデーション
    if (!formData.group_name?.trim()) {
      toast.error('来訪計測グループ名を入力してください');
      return;
    }

    // 指定半径またはポリゴンの必須チェック
    if (!formData.use_polygon) {
      if (!formData.designated_radius || formData.designated_radius.trim() === '') {
        toast.error('指定半径は必須項目です');
        return;
      }
    } else {
      if (!formData.polygon || formData.polygon.length === 0) {
        toast.error('ポリゴンを描画してください');
        return;
      }
    }

    // グループ名の重複チェック（編集時は現在のグループを除外）
    const otherGroups = existingGroups.filter(g => g.group_id !== group?.group_id);
    const duplicateGroup = otherGroups.find(g => g.group_name.trim() === formData.group_name?.trim());
    if (duplicateGroup) {
      toast.error('同じ名前のグループが既に存在します');
      return;
    }

    // 来店計測地点の場合は指定属性と検知回数をundefinedに設定（DBに保存しない）
    const submitData = {
      ...formData,
      attribute: undefined,
      detection_count: undefined,
    };

    onSubmit(submitData);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-5 flex items-center justify-between z-10 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#5b5fff]/10 flex items-center justify-center">
              <Settings className="w-5 h-5 text-[#5b5fff]" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {group ? '計測条件の設定' : 'グループを作成'}
              </h2>
              {group ? (
                <p className="text-sm text-gray-500 mt-0.5">
                  {group.group_name}
                </p>
              ) : (
                <p className="text-sm text-gray-500 mt-0.5">
                  来店計測地点グループの計測条件を設定します
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-lg hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* グループ名 */}
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <Label htmlFor="group_name" className="block mb-2 text-sm font-semibold text-gray-900">
              来訪計測グループ名 <span className="text-red-600">*</span>
            </Label>
            <Input
              id="group_name"
              value={formData.group_name || ''}
              onChange={(e) => handleChange('group_name', e.target.value)}
              placeholder="例：店舗A、エリア1"
              className="w-full bg-white"
              required
            />
            {poiCount > 0 && (
              <p className="text-sm text-gray-600 mt-2 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#5b5fff]"></span>
                このグループに属する地点数: <span className="font-medium">{poiCount}件</span>
              </p>
            )}
          </div>

          {/* 抽出条件 */}
          <div className="border-t border-gray-200 pt-6">
            <SegmentFormCommonConditions
              formData={formData as Partial<{ 
                designated_radius?: string;
                use_polygon?: boolean;
                polygon?: number[][];
                extraction_period?: string;
                extraction_period_type?: 'preset' | 'custom' | 'specific_dates';
                extraction_start_date?: string;
                extraction_end_date?: string;
                extraction_dates?: string[];
                attribute?: 'detector' | 'resident' | 'worker' | 'resident_and_worker';
                detection_count?: number;
                detection_time_start?: string;
                detection_time_end?: string;
                stay_time?: string;
              }>}
              onChange={handleChange}
              titleLabel="計測条件"
              extractionLabel="計測期間"
              noteLabel="※ このグループに属する全地点に同じ条件が適用されます"
              isVisitMeasurement={true}
            />
          </div>

          {/* ボタン */}
          <div className="flex justify-end gap-3 pt-6 border-t border-gray-200 bg-gray-50 -mx-6 -mb-6 px-6 py-4 rounded-b-xl">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              className="border-gray-300 hover:border-gray-400 text-gray-700 hover:bg-gray-50 px-6"
            >
              キャンセル
            </Button>
            <Button 
              type="submit" 
              className="bg-[#5b5fff] text-white hover:bg-[#4949dd] px-6 shadow-sm"
            >
              {group ? '更新する' : '設定を保存'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
