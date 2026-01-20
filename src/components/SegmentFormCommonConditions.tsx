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
  // 半径30m以下の警告ポップアップ表示状態
  const [showRadius30mWarning, setShowRadius30mWarning] = useState(false);
  const [hasShownRadius30mWarning, setHasShownRadius30mWarning] = useState(false);
  // 6ヶ月以上前の日付選択警告ポップアップ表示状態
  const [showDateRangeWarning, setShowDateRangeWarning] = useState(false);
  const fixedRadiusOptions = [1000, 1500, 2000, 2500, 3000, 3500, 4000, 4500, 5000, 6000, 7000, 8000, 9000, 10000];

  // 6ヶ月前の日付を計算（YYYY-MM-DD形式）
  const getSixMonthsAgoDate = (): string => {
    const date = new Date();
    date.setMonth(date.getMonth() - 6);
    return date.toISOString().split('T')[0];
  };

  // 日付が6ヶ月以上前かどうかをチェック
  const isDateMoreThanSixMonthsAgo = (dateString: string): boolean => {
    if (!dateString) return false;
    const selectedDate = new Date(dateString);
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    return selectedDate < sixMonthsAgo;
  };
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
          <div className="flex items-start gap-2">
            <div className="flex flex-col gap-1 flex-1">
              <span className="text-xs text-gray-500">手入力（1〜1000m）</span>
              <div className="flex items-center gap-2">
                <Input
                  id="designated_radius"
                  type="number"
                  min="1"
                  max="1000"
                  step="1"
                  placeholder="1-1000"
                  value={(() => {
                    const radiusNum = parseInt(String(formData.designated_radius || '').replace('m', ''), 10);
                    if (!isNaN(radiusNum) && radiusNum <= 1000) {
                      return String(radiusNum);
                    }
                    return '';
                  })()}
                  onChange={(e) => {
                    const value = e.target.value;
                    const radiusNum = parseInt(value, 10);
                    if (value === '' || (!isNaN(radiusNum) && radiusNum >= 1 && radiusNum <= 1000)) {
                      onChange('designated_radius', value ? `${value}m` : '');
                      
                      if (!isNaN(radiusNum) && radiusNum > 0) {
                        // 半径が30m以下の場合、警告ポップアップを表示（一度だけ）
                        if (radiusNum <= 30 && !hasShownRadius30mWarning) {
                          setShowRadius30mWarning(true);
                          setHasShownRadius30mWarning(true);
                        } else if (radiusNum > 30 && radiusNum <= 50) {
                          // 30mを超えて50m以下の場合、30m警告フラグをリセットして50m警告を表示
                          setHasShownRadius30mWarning(false);
                          if (!hasShownRadiusWarning) {
                            setShowRadiusWarning(true);
                            setHasShownRadiusWarning(true);
                          }
                        } else if (radiusNum > 50) {
                          // 50mを超えた場合、警告表示フラグをリセット
                          setHasShownRadiusWarning(false);
                          setHasShownRadius30mWarning(false);
                        }
                      }
                    }
                  }}
                  className="flex-1"
                  required
                />
                <span className="text-sm text-gray-500 whitespace-nowrap">m</span>
              </div>
            </div>
            <div className="flex flex-col gap-1 min-w-[180px]">
              <span className="text-xs text-gray-500">選択（1000m以上）</span>
              <select
                value={(() => {
                  const radiusNum = parseInt(String(formData.designated_radius || '').replace('m', ''), 10);
                  if (!isNaN(radiusNum) && radiusNum >= 1000) {
                    return fixedRadiusOptions.includes(radiusNum) ? String(radiusNum) : '';
                  }
                  return '';
                })()}
                onChange={(e) => {
                  const value = e.target.value;
                  if (!value) {
                    onChange('designated_radius', '');
                    return;
                  }
                  onChange('designated_radius', `${value}m`);
                }}
                className="h-10 px-3 py-2 border border-gray-300 rounded-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="">手入力に戻す</option>
                {fixedRadiusOptions.map((value) => (
                  <option key={value} value={value}>{value}m</option>
                ))}
              </select>
            </div>
          </div>
          <p className="text-xs text-gray-500">手入力か選択のどちらかで指定してください</p>
          {formData.designated_radius && (() => {
            const radiusNum = parseInt(String(formData.designated_radius).replace('m', ''));
            if (isNaN(radiusNum)) {
              return (
                <p className="text-sm text-red-600 flex items-center gap-1">
                  <span>⚠️</span>
                  半径は数値で入力してください
                </p>
              );
            }
            if (radiusNum >= 1000 && !fixedRadiusOptions.includes(radiusNum)) {
              return (
                <p className="text-sm text-red-600 flex items-center gap-1">
                  <span>⚠️</span>
                  1000m以上は選択肢から指定してください
                </p>
              );
            }
            if (radiusNum < 1 || radiusNum > 10000) {
              return (
                <p className="text-sm text-red-600 flex items-center gap-1">
                  <span>⚠️</span>
                  半径は1-1000m、または選択肢で指定してください
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
              <p className="text-xs text-purple-700">抽出対象とする日付を複数選択できます（直近6ヶ月まで）</p>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {(formData.extraction_dates || []).map((d, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Input
                      type="date"
                      value={d}
                      min={getSixMonthsAgoDate()}
                      max={new Date().toISOString().split('T')[0]}
                      onChange={(e) => {
                        const selectedDate = e.target.value;
                        if (isDateMoreThanSixMonthsAgo(selectedDate)) {
                          setShowDateRangeWarning(true);
                          return; // 日付を更新しない
                        }
                        const arr = [...(formData.extraction_dates || [])];
                        arr[i] = selectedDate;
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

      {/* 半径30m以下の警告ポップアップ */}
      <AlertDialog open={showRadius30mWarning} onOpenChange={setShowRadius30mWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-600" />
              配信ボリュームに関する警告
            </AlertDialogTitle>
            <AlertDialogDescription className="pt-4">
              <div className="space-y-2">
                <p className="text-base font-medium text-gray-900">
                  指定半径が30m以下の場合は配信ボリュームが不足する場合があります。
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setShowRadius30mWarning(false)}>
              了解しました
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 半径30m以下の警告ポップアップ */}
      <AlertDialog open={showRadius30mWarning} onOpenChange={setShowRadius30mWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-600" />
              配信ボリュームに関する警告
            </AlertDialogTitle>
            <AlertDialogDescription className="pt-4">
              <div className="space-y-2">
                <p className="text-base font-medium text-gray-900">
                  指定半径が30m以下の場合は配信ボリュームが不足する場合があります。
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setShowRadius30mWarning(false)}>
              了解しました
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 6ヶ月以上前の日付選択警告ポップアップ */}
      <AlertDialog open={showDateRangeWarning} onOpenChange={setShowDateRangeWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-orange-600" />
              日付範囲の制限
            </AlertDialogTitle>
            <AlertDialogDescription className="pt-4">
              <div className="space-y-2">
                <p className="text-base font-medium text-gray-900">
                  抽出対象日付は直近6ヶ月まで選択可能です。
                </p>
                <p className="text-sm text-gray-700">
                  6ヶ月以上前の日付を指定する場合は、アースラでBW依頼をしてください。
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setShowDateRangeWarning(false)}>
              了解しました
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
