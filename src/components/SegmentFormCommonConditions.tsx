import { useState } from 'react';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Settings, Target, Clock, Calendar, Users, AlertCircle } from 'lucide-react';
import { Segment, EXTRACTION_PERIOD_PRESET_OPTIONS, ATTRIBUTE_OPTIONS, STAY_TIME_OPTIONS } from '../types/schema';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog';

interface SegmentFormCommonConditionsProps {
  formData: Partial<Segment>;
  onChange: (field: string, value: any) => void;
}

export function SegmentFormCommonConditions({ formData, onChange }: SegmentFormCommonConditionsProps) {
  // 半径50m以下の警告ポップアップ表示状態
  const [showRadiusWarning, setShowRadiusWarning] = useState(false);
  const [hasShownRadiusWarning, setHasShownRadiusWarning] = useState(false);
  return (
    <div className="border-2 border-purple-200 rounded-lg p-6 bg-gradient-to-r from-purple-50 to-pink-50 space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <Settings className="w-5 h-5 text-purple-600" />
        <h3 className="font-medium text-purple-900">セグメント共通条件</h3>
        <Badge className="bg-purple-600 text-white ml-2">全地点に適用</Badge>
      </div>
      <p className="text-sm text-purple-800 mb-4">
        ※ このセグメントに属する全地点に同じ条件が適用されます
      </p>

      {/* 指定半径 */}
      <div>
        <Label htmlFor="designated_radius" className="block mb-2 flex items-center gap-2">
          <Target className="w-4 h-4 text-purple-600" />
          指定半径 <span className="text-red-600">*</span>
        </Label>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Input
              id="designated_radius"
              type="number"
              min="0"
              max="10000"
              step="1"
              placeholder="0-10000の範囲で自由入力（m単位）"
              value={formData.designated_radius ? String(formData.designated_radius).replace('m', '') : ''}
              onChange={(e) => {
                const value = e.target.value;
                if (value === '' || (parseInt(value) >= 0 && parseInt(value) <= 10000)) {
                  onChange('designated_radius', value ? `${value}m` : '');
                  
                  // 半径が50m以下の場合、警告ポップアップを表示（一度だけ）
                  const radiusNum = parseInt(value);
                  if (!isNaN(radiusNum) && radiusNum > 0 && radiusNum <= 50 && !hasShownRadiusWarning) {
                    setShowRadiusWarning(true);
                    setHasShownRadiusWarning(true);
                  } else if (radiusNum > 50) {
                    // 50mを超えた場合は警告表示フラグをリセット
                    setHasShownRadiusWarning(false);
                  }
                }
              }}
              className="flex-1"
              required
            />
            <span className="text-sm text-gray-500 whitespace-nowrap">m</span>
          </div>
          {formData.designated_radius && (() => {
            const radiusNum = parseInt(String(formData.designated_radius).replace('m', ''));
            if (isNaN(radiusNum) || radiusNum < 0 || radiusNum > 10000) {
              return (
                <p className="text-sm text-red-600 flex items-center gap-1">
                  <span>⚠️</span>
                  半径は0-10000の範囲で入力してください
                </p>
              );
            }
            return null;
          })()}
        </div>
      </div>

      {/* 抽出期間 */}
      <div>
        <Label className="block mb-2 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-purple-600" />
          抽出期間 <span className="text-red-600">*</span>
        </Label>
        <div className="space-y-3">
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                checked={formData.extraction_period_type === 'preset'}
                onChange={() => onChange('extraction_period_type', 'preset')}
                className="w-4 h-4 text-purple-600 border-gray-300 focus:ring-purple-500"
                disabled={formData.attribute === 'resident' || formData.attribute === 'worker' || formData.attribute === 'resident_and_worker'}
              />
              <span className="text-sm">プリセット</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                checked={formData.extraction_period_type === 'custom'}
                onChange={() => onChange('extraction_period_type', 'custom')}
                className="w-4 h-4 text-purple-600 border-gray-300 focus:ring-purple-500"
                disabled={formData.attribute === 'resident' || formData.attribute === 'worker' || formData.attribute === 'resident_and_worker'}
              />
              <span className="text-sm">期間指定</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                checked={formData.extraction_period_type === 'specific_dates'}
                onChange={() => onChange('extraction_period_type', 'specific_dates')}
                className="w-4 h-4 text-purple-600 border-gray-300 focus:ring-purple-500"
                disabled={formData.attribute === 'resident' || formData.attribute === 'worker' || formData.attribute === 'resident_and_worker'}
              />
              <span className="text-sm">特定日付</span>
            </label>
          </div>

          {formData.extraction_period_type === 'preset' ? (
            <select
              value={formData.extraction_period || ''}
              onChange={(e) => onChange('extraction_period', e.target.value)}
              className="w-full px-3 py-2 border border-purple-300 rounded-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              disabled={formData.attribute === 'resident' || formData.attribute === 'worker'}
            >
              <option value="">選択してください</option>
              {EXTRACTION_PERIOD_PRESET_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          ) : formData.extraction_period_type === 'specific_dates' ? (
            <div className="space-y-2">
              <p className="text-xs text-purple-700">抽出対象とする日付を複数選択できます</p>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {(formData.extraction_dates || []).map((d, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Input
                      type="date"
                      value={d}
                      onChange={(e) => {
                        const arr = [...(formData.extraction_dates || [])];
                        arr[i] = e.target.value;
                        onChange('extraction_dates', arr);
                      }}
                      className="flex-1"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const arr = (formData.extraction_dates || []).filter((_, j) => j !== i);
                        onChange('extraction_dates', arr);
                      }}
                      className="text-red-600 hover:text-red-800 text-sm px-2"
                    >
                      削除
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() => onChange('extraction_dates', [...(formData.extraction_dates || []), ''])}
                className="text-sm text-purple-600 hover:text-purple-800 font-medium"
              >
                + 日付を追加
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs mb-1 block">開始日</Label>
                <Input
                  type="date"
                  value={formData.extraction_start_date || ''}
                  onChange={(e) => onChange('extraction_start_date', e.target.value)}
                  className="w-full"
                />
              </div>
              <div>
                <Label className="text-xs mb-1 block">終了日</Label>
                <Input
                  type="date"
                  value={formData.extraction_end_date || ''}
                  onChange={(e) => onChange('extraction_end_date', e.target.value)}
                  className="w-full"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 指定属性 */}
      <div>
        <Label htmlFor="attribute" className="block mb-2 flex items-center gap-2">
          <Users className="w-4 h-4 text-purple-600" />
          指定属性 <span className="text-red-600">*</span>
        </Label>
        <select
          id="attribute"
          value={formData.attribute || 'detector'}
          onChange={(e) => onChange('attribute', e.target.value)}
          className="w-full px-3 py-2 border border-purple-300 rounded-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        >
          {ATTRIBUTE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {(formData.attribute === 'resident' || formData.attribute === 'worker' || formData.attribute === 'resident_and_worker') && (
          <p className="text-xs text-purple-700 mt-2">
            ※ 居住者・勤務者・居住者&勤務者の場合、抽出期間は3ヶ月固定です
          </p>
        )}
      </div>

      {/* 検知回数（検知者の場合のみ） */}
      {formData.attribute === 'detector' && (
        <div>
          <Label htmlFor="detection_count" className="block mb-2 flex items-center gap-2">
            <Target className="w-4 h-4 text-purple-600" />
            検知回数（〇回以上）
          </Label>
          <div className="flex items-center gap-2">
            <Input
              id="detection_count"
              type="number"
              min="1"
              value={formData.detection_count || 1}
              onChange={(e) => onChange('detection_count', parseInt(e.target.value) || 1)}
              className="w-full"
            />
            <span className="text-sm text-gray-700 whitespace-nowrap">回以上</span>
          </div>
        </div>
      )}

      {/* 検知時間帯（検知者の場合のみ） */}
      {formData.attribute === 'detector' && (
        <div>
          <Label className="block mb-2 flex items-center gap-2">
            <Clock className="w-4 h-4 text-purple-600" />
            検知時間帯
          </Label>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs mb-1 block">開始時刻</Label>
              <Input
                type="time"
                value={formData.detection_time_start || ''}
                onChange={(e) => onChange('detection_time_start', e.target.value)}
                className="w-full"
              />
            </div>
            <div>
              <Label className="text-xs mb-1 block">終了時刻</Label>
              <Input
                type="time"
                value={formData.detection_time_end || ''}
                onChange={(e) => onChange('detection_time_end', e.target.value)}
                className="w-full"
              />
            </div>
          </div>
        </div>
      )}

      {/* 滞在時間 */}
      <div>
        <Label htmlFor="stay_time" className="block mb-2 flex items-center gap-2">
          <Clock className="w-4 h-4 text-purple-600" />
          滞在時間
        </Label>
        <select
          id="stay_time"
          value={formData.stay_time || ''}
          onChange={(e) => onChange('stay_time', e.target.value)}
          className="w-full px-3 py-2 border border-purple-300 rounded-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        >
          <option value="">指定なし</option>
          {STAY_TIME_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {/* 半径50m以下の警告ポップアップ */}
      <AlertDialog open={showRadiusWarning} onOpenChange={setShowRadiusWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-yellow-600" />
              配信ボリュームに関する警告
            </AlertDialogTitle>
            <AlertDialogDescription className="pt-4">
              <div className="space-y-2">
                <p className="text-base font-medium text-gray-900">
                  配信ボリュームが担保できない可能性があります。
                </p>
                <p className="text-sm text-gray-700">
                  半径緩和用のセグメントを追加することを推奨します。
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setShowRadiusWarning(false)}>
              了解しました
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
