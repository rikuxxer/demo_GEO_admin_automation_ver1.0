import { useState, useEffect, useRef, memo } from 'react';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Settings, Target, Clock, Calendar, Users, AlertCircle, Map } from 'lucide-react';
import { Segment, EXTRACTION_PERIOD_PRESET_OPTIONS, ATTRIBUTE_OPTIONS, STAY_TIME_OPTIONS } from '../types/schema';
import { toast } from 'sonner';
import { PolygonMapEditor } from './PolygonMapEditor';
import { validatePolygonRange } from '../utils/polygonUtils';
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
  formData: Partial<Segment> & { use_polygon?: boolean; polygon?: number[][]; polygons?: number[][][] };
  onChange: (field: string, value: any) => void;
  // 文言上書き用（訪問計測向けに利用）
  titleLabel?: string;
  extractionLabel?: string;
  noteLabel?: string;
  // 来店計測地点の場合は指定属性と検知回数を無効化
  isVisitMeasurement?: boolean;
}

function SegmentFormCommonConditionsInner({ formData, onChange, titleLabel, extractionLabel, noteLabel, isVisitMeasurement = false }: SegmentFormCommonConditionsProps) {
  const [showPolygonEditor, setShowPolygonEditor] = useState(false);
  
  // ポリゴンデータの初期化（複数ポリゴン対応）
  const initializePolygons = (): Array<{ id: string; coordinates: number[][]; name?: string }> => {
    // 複数ポリゴン（polygons）を優先、なければ単一ポリゴン（polygon）を使用
    if (formData.polygons && Array.isArray(formData.polygons) && formData.polygons.length > 0) {
      return formData.polygons.map((poly, index) => ({
        id: `polygon-${index}`,
        coordinates: poly,
      }));
    } else if (formData.polygon && formData.polygon.length > 0) {
      // 後方互換性：単一ポリゴンを複数ポリゴン形式に変換
      return [{ id: 'polygon-0', coordinates: formData.polygon }];
    }
    return [];
  };
  
  const [polygons, setPolygons] = useState<Array<{ id: string; coordinates: number[][]; name?: string }>>(initializePolygons());
  const polygonSignatureRef = useRef<string>('');
  const headingText = titleLabel ?? 'セグメント共通条件';
  const periodLabel = extractionLabel ?? '抽出期間';
  const noteText = noteLabel ?? '※ このセグメントに属する全地点に同じ条件が適用されます';

  // 既存のポリゴンデータを読み込む（参照だけ変わり内容が同じときは setPolygons しないでフリーズ・不要な再レンダーを防止）
  useEffect(() => {
    const initialized = initializePolygons();
    const signature = JSON.stringify(initialized.map(p => p.coordinates));
    if (polygonSignatureRef.current === signature) return;
    polygonSignatureRef.current = signature;
    setPolygons(initialized);
  }, [formData.polygon, formData.polygons]);
  // 半径50m以下の警告ポップアップ表示状態
  const [showRadiusWarning, setShowRadiusWarning] = useState(false);
  const [hasShownRadiusWarning, setHasShownRadiusWarning] = useState(false);
  // 半径30m以下の警告ポップアップ表示状態
  const [showRadius30mWarning, setShowRadius30mWarning] = useState(false);
  const [hasShownRadius30mWarning, setHasShownRadius30mWarning] = useState(false);
  // 6ヶ月以上前の日付選択警告ポップアップ表示状態
  const [showDateRangeWarning, setShowDateRangeWarning] = useState(false);
  // 指定半径: 自由入力は非制御にして入力中の再レンダー・フリーズを防止。ドロップダウン用にドラフトのみ state で保持。
  const [designatedRadiusDraft, setDesignatedRadiusDraft] = useState('');
  const radiusFreeInputRef = useRef<HTMLInputElement>(null);
  const [radiusBlurError, setRadiusBlurError] = useState<string | null>(null);
  const fixedRadiusOptions = [1000, 1500, 2000, 2500, 3000, 3500, 4000, 4500, 5000, 6000, 7000, 8000, 9000, 10000];

  const parsedRadiusFromForm = formData.designated_radius
    ? (() => { const n = parseInt(String(formData.designated_radius).replace('m', ''), 10); return !isNaN(n) ? String(n) : ''; })()
    : '';

  // 6ヶ月前の日付を計算（YYYY-MM-DD形式）
  const getSixMonthsAgoDate = (): string => {
    const date = new Date();
    date.setMonth(date.getMonth() - 6);
    return date.toISOString().split('T')[0];
  };

  // 5日前の日付を計算（YYYY-MM-DD形式）
  const getFiveDaysAgoDate = (): string => {
    const date = new Date();
    date.setDate(date.getDate() - 5);
    return date.toISOString().split('T')[0];
  };

  // 日付が5日前より前かどうかをチェック
  const isDateMoreThanFiveDaysAgo = (dateString: string): boolean => {
    if (!dateString) return false;
    const selectedDate = new Date(dateString);
    const fiveDaysAgo = new Date();
    fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
    return selectedDate < fiveDaysAgo;
  };

  // 日付が6ヶ月以上前かどうかをチェック
  const isDateMoreThanSixMonthsAgo = (dateString: string): boolean => {
    if (!dateString) return false;
    const selectedDate = new Date(dateString);
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    return selectedDate < sixMonthsAgo;
  };

  // extraction_dates の内容が同じなら onChange を呼ばない（不要な親の再レンダー・フリーズ防止）
  const extractionDatesEqual = (a: string[] | undefined, b: string[] | undefined): boolean => {
    const arrA = a ?? [];
    const arrB = b ?? [];
    if (arrA.length !== arrB.length) return false;
    return arrA.every((v, i) => v === arrB[i]);
  };

  // 編集時・ドロップダウン選択時にドラフトを formData.designated_radius のみに同期（他フィールド編集時の不要な再実行を防ぐ）
  useEffect(() => {
    const nextDraft = parsedRadiusFromForm;
    setDesignatedRadiusDraft(prev => (prev === nextDraft ? prev : nextDraft));
  }, [formData.designated_radius]);

  return (
    <div className="border border-gray-200 rounded-lg p-6 bg-white space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <Settings className="w-5 h-5 text-gray-600" />
        <h3 className="font-medium text-gray-900">{headingText}</h3>
        <Badge className="bg-gray-600 text-white ml-2">全地点に適用</Badge>
      </div>
      <p className="text-sm text-gray-700 mb-4">
        {noteText}
      </p>

      {/* 指定方法の選択（来店計測の場合のみ） */}
      {isVisitMeasurement && (
        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <Label className="block mb-3 text-sm font-semibold text-gray-900">
            計測範囲の指定方法
          </Label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                checked={!formData.use_polygon}
                onChange={() => {
                  onChange('use_polygon', false);
                  onChange('polygon', undefined);
                  setPolygons([]);
                }}
                className="w-4 h-4 text-[#5b5fff] border-gray-300 focus:ring-[#5b5fff]"
              />
              <span className="text-sm">指定半径</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                checked={formData.use_polygon === true}
                onChange={() => {
                  onChange('use_polygon', true);
                  onChange('designated_radius', undefined);
                }}
                className="w-4 h-4 text-[#5b5fff] border-gray-300 focus:ring-[#5b5fff]"
              />
              <span className="text-sm">ポリゴン指定</span>
            </label>
          </div>
        </div>
      )}

      {/* 指定半径（ポリゴン指定が選択されていない場合のみ） */}
      {(!isVisitMeasurement || !formData.use_polygon) && (
      <div>
        <Label htmlFor="designated_radius" className="block mb-2 flex items-center gap-2">
          <Target className="w-4 h-4 text-gray-600" />
          指定半径 <span className="text-red-600">*</span>
        </Label>
        <p className="text-xs text-gray-500 mb-2">自由入力か選択のどちらかで指定してください</p>
        <div className="space-y-2">
          <div className="flex items-start gap-2">
            <div className="flex flex-col gap-1 flex-1">
              <span className="text-xs text-gray-500">自由入力（1〜1000m）</span>
              <div className="flex items-center gap-2">
                <Input
                  ref={radiusFreeInputRef}
                  id="designated_radius"
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  placeholder="1-1000"
                  defaultValue={parsedRadiusFromForm}
                  onInput={(e) => {
                    const el = e.currentTarget;
                    const digits = el.value.replace(/\D/g, '');
                    if (digits !== el.value) el.value = digits;
                  }}
                  onBlur={() => {
                    setRadiusBlurError(null);
                    const raw = radiusFreeInputRef.current?.value?.trim() ?? '';
                    if (raw === '') {
                      onChange('designated_radius', '');
                      setDesignatedRadiusDraft('');
                      return;
                    }
                    const radiusNum = parseInt(raw, 10);
                    const isFixed = fixedRadiusOptions.includes(radiusNum);
                    if (Number.isNaN(radiusNum)) {
                      setRadiusBlurError('半径は数値で入力してください');
                      return;
                    }
                    if (radiusNum >= 1000 && !isFixed) {
                      setRadiusBlurError('1000m以上は選択肢から指定してください');
                      return;
                    }
                    if (radiusNum < 1 || radiusNum > 10000) {
                      setRadiusBlurError('半径は1-1000m、または選択肢で指定してください');
                      return;
                    }
                    // "XXm" 形式で保存（スプシ掃き出し・parseRadius と同一）
                    onChange('designated_radius', `${radiusNum}m`);
                    setDesignatedRadiusDraft(String(radiusNum));
                    if (radiusNum > 0) {
                      const isVisitMeasurementGroup = titleLabel === '来訪計測グループ条件';
                      if (!isVisitMeasurementGroup) {
                        if (radiusNum <= 30 && !hasShownRadius30mWarning) {
                          setShowRadius30mWarning(true);
                          setHasShownRadius30mWarning(true);
                        } else if (radiusNum > 30 && radiusNum <= 50) {
                          setHasShownRadius30mWarning(false);
                          if (!hasShownRadiusWarning) {
                            setShowRadiusWarning(true);
                            setHasShownRadiusWarning(true);
                          }
                        } else if (radiusNum > 50) {
                          setShowRadiusWarning(false);
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
                  const draftNum = Number(designatedRadiusDraft);
                  if (designatedRadiusDraft !== '' && !Number.isNaN(draftNum) && draftNum >= 1000) {
                    return fixedRadiusOptions.includes(draftNum) ? String(draftNum) : '';
                  }
                  return '';
                })()}
                onChange={(e) => {
                  const value = e.target.value;
                  setRadiusBlurError(null);
                  if (!value) {
                    setDesignatedRadiusDraft('');
                    onChange('designated_radius', '');
                    if (radiusFreeInputRef.current) radiusFreeInputRef.current.value = '';
                    return;
                  }
                  setDesignatedRadiusDraft(value);
                  onChange('designated_radius', `${value}m`);
                  if (radiusFreeInputRef.current) radiusFreeInputRef.current.value = value;
                }}
                className="h-10 px-3 py-2 border border-gray-300 rounded-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent"
              >
                <option value="">自由入力に戻す</option>
                {fixedRadiusOptions.map((value) => (
                  <option key={value} value={value}>{value}m</option>
                ))}
              </select>
            </div>
          </div>
          {(() => {
            const err = radiusBlurError ?? (designatedRadiusDraft ? (() => {
              const radiusNum = parseInt(String(designatedRadiusDraft).replace('m', ''), 10);
              if (isNaN(radiusNum)) return '半径は数値で入力してください';
              if (radiusNum >= 1000 && !fixedRadiusOptions.includes(radiusNum)) return '1000m以上は選択肢から指定してください';
              if (radiusNum < 1 || radiusNum > 10000) return '半径は1-1000m、または選択肢で指定してください';
              return null;
            })() : null);
            return err ? (
              <p className="text-sm text-red-600 flex items-center gap-1">
                <span>⚠️</span>
                {err}
              </p>
            ) : null;
          })()}
        </div>
      </div>
      )}

      {/* ポリゴン指定（来店計測でポリゴン指定が選択された場合） */}
      {isVisitMeasurement && formData.use_polygon && (
        <div>
          <Label className="block mb-2 flex items-center gap-2">
            <Map className="w-4 h-4 text-gray-600" />
            ポリゴン指定 <span className="text-red-600">*</span>
          </Label>
          <p className="text-xs text-gray-500 mb-3">
            地図上でポリゴンを描画して計測範囲を指定します
          </p>
          {!showPolygonEditor && (
            <div className="space-y-2">
              {polygons.length > 0 ? (
                <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                  <p className="text-sm text-gray-700 mb-2">
                    ポリゴンが設定されています（{polygons.length}/10個）
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowPolygonEditor(true)}
                    className="text-sm border-gray-300"
                  >
                    ポリゴンを編集
                  </Button>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowPolygonEditor(true)}
                  className="w-full border-gray-300"
                >
                  <Map className="w-4 h-4 mr-2" />
                  ポリゴンを描画
                </Button>
              )}
            </div>
          )}
          {showPolygonEditor && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl shadow-2xl w-[90vw] h-[90vh] max-w-7xl flex flex-col">
                <PolygonMapEditor
                  polygons={polygons}
                  maxPolygons={10}
                  onPolygonsChange={(newPolygons) => {
                    setPolygons(newPolygons);
                    if (newPolygons.length > 0) {
                      // すべてのポリゴンの範囲を検証
                      for (const polygon of newPolygons) {
                        const validation = validatePolygonRange(polygon.coordinates);
                        if (!validation.valid) {
                          toast.error(validation.error || 'ポリゴンの範囲が広すぎます');
                          return;
                        }
                      }
                      // 複数ポリゴンを保存（来店計測の場合）
                      if (isVisitMeasurement) {
                        const polygonsArray = newPolygons.map(p => p.coordinates);
                        onChange('polygons', polygonsArray);
                        // 後方互換性のため、最初のポリゴンもpolygonに保存
                        onChange('polygon', newPolygons[0].coordinates);
                      } else {
                        // セグメント共通条件の場合は単一ポリゴンのみ
                        onChange('polygon', newPolygons[0].coordinates);
                      }
                    } else {
                      onChange('polygon', undefined);
                      onChange('polygons', undefined);
                    }
                  }}
                  onClose={() => setShowPolygonEditor(false)}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* 抽出期間 / 計測期間 */}
      <div>
        <Label className="block mb-2 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-gray-600" />
          {periodLabel} <span className="text-red-600">*</span>
        </Label>
        <div className="space-y-3">
          <div className="flex flex-wrap gap-4">
            {!isVisitMeasurement && (
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={formData.extraction_period_type === 'preset'}
                  onChange={() => onChange('extraction_period_type', 'preset')}
                  className="w-4 h-4 text-gray-600 border-gray-300 focus:ring-gray-500"
                  disabled={formData.attribute === 'resident' || formData.attribute === 'worker' || formData.attribute === 'resident_and_worker'}
                />
                <span className="text-sm">プリセット</span>
              </label>
            )}
            <label className="flex items-center gap-2">
              <input
                type="radio"
                checked={formData.extraction_period_type === 'custom'}
                onChange={() => onChange('extraction_period_type', 'custom')}
                className="w-4 h-4 text-gray-600 border-gray-300 focus:ring-gray-500"
                disabled={formData.attribute === 'resident' || formData.attribute === 'worker' || formData.attribute === 'resident_and_worker'}
              />
              <span className="text-sm">期間指定</span>
            </label>
            {!isVisitMeasurement && (
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={formData.extraction_period_type === 'specific_dates'}
                  onChange={() => onChange('extraction_period_type', 'specific_dates')}
                  className="w-4 h-4 text-gray-600 border-gray-300 focus:ring-gray-500"
                  disabled={formData.attribute === 'resident' || formData.attribute === 'worker' || formData.attribute === 'resident_and_worker'}
                />
                <span className="text-sm">特定日付</span>
              </label>
            )}
          </div>

          {!isVisitMeasurement && formData.extraction_period_type === 'preset' ? (
            <div className="space-y-2">
              <p className="text-xs text-gray-700">プリセット期間を選択してください</p>
              <select
                value={formData.extraction_period || '1month'}
                onChange={(e) => onChange('extraction_period', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent"
              >
                {EXTRACTION_PERIOD_PRESET_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          ) : !isVisitMeasurement && formData.extraction_period_type === 'specific_dates' ? (
            <div className="space-y-2">
              <p className="text-xs text-gray-700">抽出対象とする日付を複数選択できます（直近6ヶ月まで）</p>
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
                        if (!extractionDatesEqual(arr, formData.extraction_dates)) onChange('extraction_dates', arr);
                      }}
                      className="flex-1"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const arr = (formData.extraction_dates || []).filter((_, j) => j !== i);
                        if (!extractionDatesEqual(arr, formData.extraction_dates)) onChange('extraction_dates', arr);
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
                className="text-sm text-gray-600 hover:text-gray-800 font-medium"
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
                  min={getFiveDaysAgoDate()}
                  max={new Date().toISOString().split('T')[0]}
                  onChange={(e) => {
                    const selectedDate = e.target.value;
                    if (isDateMoreThanFiveDaysAgo(selectedDate)) {
                      toast.error('開始日は5日前以降の日付を指定してください');
                      return;
                    }
                    onChange('extraction_start_date', selectedDate);
                  }}
                  className="w-full"
                />
                <p className="text-xs text-gray-500 mt-1">5日前以降の日付を指定してください</p>
              </div>
              <div>
                <Label className="text-xs mb-1 block">終了日</Label>
                <Input
                  type="date"
                  value={formData.extraction_end_date || ''}
                  min={getFiveDaysAgoDate()}
                  max={new Date().toISOString().split('T')[0]}
                  onChange={(e) => {
                    const selectedDate = e.target.value;
                    if (isDateMoreThanFiveDaysAgo(selectedDate)) {
                      toast.error('終了日は5日前以降の日付を指定してください');
                      return;
                    }
                    onChange('extraction_end_date', selectedDate);
                  }}
                  className="w-full"
                />
                <p className="text-xs text-gray-500 mt-1">5日前以降の日付を指定してください</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 指定属性（来店計測地点の場合は非表示） */}
      {!isVisitMeasurement && (
        <div>
          <Label htmlFor="attribute" className="block mb-2 flex items-center gap-2">
            <Users className="w-4 h-4 text-gray-600" />
            指定属性 <span className="text-red-600">*</span>
          </Label>
          <select
            id="attribute"
            value={formData.attribute || 'detector'}
            onChange={(e) => onChange('attribute', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent"
          >
            {ATTRIBUTE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {(formData.attribute === 'resident' || formData.attribute === 'worker' || formData.attribute === 'resident_and_worker') && (
            <p className="text-xs text-gray-700 mt-2">
              ※ 居住者・勤務者・居住者&勤務者の場合、抽出期間は3ヶ月固定です
            </p>
          )}
        </div>
      )}

      {/* 検知回数（検知者の場合のみ、来店計測地点の場合は非表示） */}
      {!isVisitMeasurement && formData.attribute === 'detector' && (
        <div>
          <Label htmlFor="detection_count" className="block mb-2 flex items-center gap-2">
            <Target className="w-4 h-4 text-gray-600" />
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
            <Clock className="w-4 h-4 text-gray-600" />
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
          <Clock className="w-4 h-4 text-gray-600" />
          滞在時間
        </Label>
        <select
          id="stay_time"
          value={formData.stay_time || ''}
          onChange={(e) => onChange('stay_time', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent"
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
                  指定半径が30m以下の場合、来店数が0になる可能性があります。
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

// formData 参照が変わらない親の再レンダー時に子の再レンダーを抑え、フリーズ・カクつきを軽減
export const SegmentFormCommonConditions = memo(SegmentFormCommonConditionsInner);
