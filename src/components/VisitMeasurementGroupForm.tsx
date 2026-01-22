import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { X, AlertCircle } from 'lucide-react';
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
    extraction_period: group?.extraction_period || '1month',
    extraction_period_type: (() => {
      const periodType = group?.extraction_period_type || 'custom';
      // 既存データに'preset'が含まれている場合は'custom'に変換
      return periodType === 'preset' ? 'custom' : periodType;
    })(),
    extraction_start_date: group?.extraction_start_date || '',
    extraction_end_date: group?.extraction_end_date || '',
    extraction_dates: group?.extraction_dates || [],
    attribute: group?.attribute || 'detector',
    detection_count: group?.detection_count || 1,
    detection_time_start: group?.detection_time_start || '',
    detection_time_end: group?.detection_time_end || '',
    stay_time: group?.stay_time || '',
  });

  // 居住者・勤務者・居住者&勤務者の場合は抽出期間を3ヶ月に固定
  useEffect(() => {
    if (formData.attribute === 'resident' || formData.attribute === 'worker' || formData.attribute === 'resident_and_worker') {
      setFormData(prev => ({
        ...prev,
        extraction_period: '3month',
        extraction_period_type: 'custom',
        extraction_dates: [],
      }));
    }
  }, [formData.attribute]);

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // バリデーション
    if (!formData.group_name?.trim()) {
      toast.error('グループ名を入力してください');
      return;
    }

    // 指定半径の必須チェック
    if (!formData.designated_radius || formData.designated_radius.trim() === '') {
      toast.error('指定半径は必須項目です');
      return;
    }

    // グループ名の重複チェック（編集時は現在のグループを除外）
    const otherGroups = existingGroups.filter(g => g.group_id !== group?.group_id);
    const duplicateGroup = otherGroups.find(g => g.group_name.trim() === formData.group_name?.trim());
    if (duplicateGroup) {
      toast.error('同じ名前のグループが既に存在します');
      return;
    }

    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-xl font-semibold text-gray-900">
            {group ? 'グループを編集' : 'グループを作成'}
          </h2>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* グループ名 */}
          <div>
            <Label htmlFor="group_name" className="block mb-2">
              グループ名 <span className="text-red-600">*</span>
            </Label>
            <Input
              id="group_name"
              value={formData.group_name || ''}
              onChange={(e) => handleChange('group_name', e.target.value)}
              placeholder="例：店舗A、エリア1"
              className="w-full"
              required
            />
            {poiCount > 0 && (
              <p className="text-sm text-gray-500 mt-1">
                このグループに属する地点数: {poiCount}件
              </p>
            )}
          </div>

          {/* 抽出条件 */}
          <div className="border-t pt-4">
            <SegmentFormCommonConditions
              formData={formData as Partial<{ 
                designated_radius?: string;
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
              titleLabel="来訪計測条件"
              extractionLabel="計測期間"
              noteLabel="※ このグループに属する全地点に同じ条件が適用されます"
            />
          </div>

          {/* ボタン */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              className="border-gray-200 hover:border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              キャンセル
            </Button>
            <Button type="submit" className="bg-[#5b5fff] text-white hover:bg-[#4949dd]">
              {group ? '更新' : '作成'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
